import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, normalizeUids, requireConfirm, uidListField } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const copyMessages = defineTool(
    "smtp_copy_messages",
    "Copy messages",
    "Copy messages to another mailbox. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField,
      uids: uidListField,
      destination: z.string().min(1)
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_copy_messages");
        return ctx.client.copyMessages(input.mailbox, normalizeUids(input.uids), input.destination);
      })
  );
