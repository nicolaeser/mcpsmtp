import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, listPayload, requireConfirm } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const getMailbox = defineTool(
    "smtp_get_mailbox",
    "Mailbox status",
    "IMAP STATUS for a mailbox: message count, unseen, uidNext, uidValidity.",
    z.object({ mailbox: mailboxField }),
    (ctx, input) => runTool(ctx, async () => ctx.client.mailboxStatus(input.mailbox))
  );
