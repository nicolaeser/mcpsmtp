import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, listPayload, requireConfirm } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const deleteMailbox = defineTool(
    "smtp_delete_mailbox",
    "Delete mailbox",
    "Delete an IMAP folder and its messages. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_delete_mailbox");
        return ctx.client.deleteMailbox(input.mailbox);
      })
  );
