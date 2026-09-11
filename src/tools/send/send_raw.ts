import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import {
  confirmField,
  normalizeRecipients,
  recipientsField,
  requireConfirm
} from "../../mcp/format.js";
import type { SendMailInput } from "../../smtp/types.js";
import { attachmentSchema } from "./helpers.js";

export const sendRaw = defineTool(
    "smtp_send_raw",
    "Send raw RFC822",
    "Send a raw RFC822 message. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      raw: z.string().min(1).describe("Complete RFC822 source."),
      envelopeFrom: z.string().min(1),
      envelopeTo: recipientsField
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_send_raw");
        return ctx.client.sendRaw({
          raw: input.raw,
          envelopeFrom: input.envelopeFrom,
          envelopeTo: normalizeRecipients(input.envelopeTo)
        });
      })
  );
