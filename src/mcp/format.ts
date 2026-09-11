import { z } from "zod";
import { ConfirmationRequiredError, errorMessage, errorName } from "../errors.js";
import { stringifyRedacted } from "../lib/redact.js";
import type { ToolResult } from "../types.js";

export const confirmField = z
  .boolean()
  .optional()
  .describe("Must be true to execute this write.");

export function toolSuccess(payload: unknown, secrets: readonly string[] = []): ToolResult {
  return {
    content: [{ type: "text", text: stringifyRedacted(payload, secrets) }]
  };
}

export function toolError(error: unknown, secrets: readonly string[] = []): ToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: stringifyRedacted({ error: errorName(error), message: errorMessage(error) }, secrets)
      }
    ]
  };
}

export function requireConfirm(confirm: boolean | undefined, toolName: string): void {
  if (confirm !== true) throw new ConfirmationRequiredError(toolName);
}

export function recordFields(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return { value };
  return { ...(value as Record<string, unknown>) };
}

export function listPayload(
  items: readonly unknown[],
  pagination?: unknown
): Record<string, unknown> {
  return { items: items.map((item) => recordFields(item)), pagination };
}

export function filePayload(
  envelope: {
    readonly filename?: string;
    readonly mimeType?: string;
    readonly base64Encoded?: boolean;
    readonly content?: string | null;
  },
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const content = envelope.content;
  return {
    ...extra,
    filename: envelope.filename,
    mimeType: envelope.mimeType,
    base64Encoded: envelope.base64Encoded,
    byteLength: typeof content === "string" ? content.length : 0,
    content: typeof content === "string" ? content : null
  };
}

export const recipientsField = z
  .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
  .describe("One address, comma-separated addresses, or an array.");

export function normalizeRecipients(value: string | readonly string[] | undefined): string[] {
  if (value === undefined) return [];
  const parts = typeof value === "string" ? value.split(/[,;]/) : value;
  const out: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

export const uidListField = z
  .union([z.array(z.number().int().positive()).min(1), z.string().min(1), z.number().int().positive()])
  .describe("One UID, comma-separated UIDs, or an array of UIDs.");

export function normalizeUids(value: number | string | readonly number[]): number[] {
  const out: number[] = [];
  const parts = typeof value === "number" ? [value] : typeof value === "string" ? value.split(/[,\s]+/) : value;
  for (const part of parts) {
    const uid = typeof part === "number" ? part : Number(String(part).trim());
    if (Number.isInteger(uid) && uid > 0 && !out.includes(uid)) out.push(uid);
  }
  return out;
}
