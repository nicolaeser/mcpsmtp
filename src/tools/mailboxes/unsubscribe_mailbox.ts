import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, listPayload, requireConfirm } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const unsubscribeMailbox = defineTool(
    "smtp_unsubscribe_mailbox",
    "Unsubscribe mailbox",
    "Remove a folder from the IMAP LSUB subscription list. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_unsubscribe_mailbox");
        return ctx.client.unsubscribeMailbox(input.mailbox);
      })
  );
