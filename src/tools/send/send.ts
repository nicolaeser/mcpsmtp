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

export const send = defineTool(
    "smtp_send",
    "Send email",
    "Send an email through the configured SMTP account. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      to: recipientsField,
      cc: recipientsField.optional(),
      bcc: recipientsField.optional(),
      from: z.string().optional().describe("Override From. Defaults to the login From address."),
      replyTo: z.string().optional(),
      subject: z.string().min(1),
      text: z.string().optional(),
      html: z.string().optional(),
      inReplyTo: z.string().optional(),
      references: z.union([z.string(), z.array(z.string())]).optional(),
      headers: z.record(z.string(), z.string()).optional(),
      attachments: z.array(attachmentSchema).max(20).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_send");
        const mail: SendMailInput = {
          to: normalizeRecipients(input.to),
          cc: input.cc === undefined ? undefined : normalizeRecipients(input.cc),
          bcc: input.bcc === undefined ? undefined : normalizeRecipients(input.bcc),
          from: input.from,
          replyTo: input.replyTo,
          subject: input.subject,
          text: input.text,
          html: input.html,
          inReplyTo: input.inReplyTo,
          references: typeof input.references === "string" ? [input.references] : input.references,
          headers: input.headers,
          attachments: input.attachments
        };
        return ctx.client.send(mail);
      })
  );
