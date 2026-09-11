import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload } from "../../mcp/format.js";
import type { SearchQuery } from "../../smtp/types.js";

export const mailboxField = z.string().min(1).default("INBOX").describe("IMAP mailbox path. Default INBOX.");
export const uidField = z.number().int().positive().describe("IMAP UID.");
export const limitField = z.number().int().min(1).max(200).default(50);
export const offsetField = z.number().int().min(0).default(0);

export const searchShape = {
  mailbox: mailboxField,
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
  text: z.string().optional().describe("Body substring search when the server supports BODY."),
  since: z.string().optional().describe("ISO-8601 or YYYY-MM-DD lower bound on internal date."),
  before: z.string().optional(),
  seen: z.boolean().optional(),
  flagged: z.boolean().optional(),
  answered: z.boolean().optional(),
  draft: z.boolean().optional(),
  uid: z.string().optional().describe("IMAP UID set, for example 10:20 or 1,4,9."),
  limit: limitField,
  offset: offsetField
};

export function toQuery(input: z.infer<z.ZodObject<typeof searchShape>>): SearchQuery {
  return {
    mailbox: input.mailbox.trim() || "INBOX",
    limit: input.limit,
    offset: input.offset,
    from: input.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    since: input.since,
    before: input.before,
    seen: input.seen,
    flagged: input.flagged,
    answered: input.answered,
    draft: input.draft,
    uid: input.uid
  };
}
