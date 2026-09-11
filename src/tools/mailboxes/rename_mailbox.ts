import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, listPayload, requireConfirm } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const renameMailbox = defineTool(
    "smtp_rename_mailbox",
    "Rename mailbox",
    "Rename an IMAP folder. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField,
      newMailbox: mailboxField.describe("New path.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_rename_mailbox");
        return ctx.client.renameMailbox(input.mailbox, input.newMailbox);
      })
  );
