import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, listPayload, requireConfirm } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const createMailbox = defineTool(
    "smtp_create_mailbox",
    "Create mailbox",
    "Create an IMAP folder. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_create_mailbox");
        return ctx.client.createMailbox(input.mailbox);
      })
  );
