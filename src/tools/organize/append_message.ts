import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, normalizeUids, requireConfirm, uidListField } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const appendMessage = defineTool(
    "smtp_append_message",
    "Append message",
    "APPEND a raw RFC822 message to a mailbox (for example Drafts). Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField,
      raw: z.string().min(1),
      flags: z.array(z.string().min(1)).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_append_message");
        return ctx.client.appendMessage(input.mailbox, input.raw, input.flags);
      })
  );
