import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, normalizeUids, requireConfirm, uidListField } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const deleteMessages = defineTool(
    "smtp_delete_messages",
    "Delete messages",
    "Flag messages as deleted and optionally expunge. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField,
      uids: uidListField,
      expunge: z.boolean().optional().describe("Default true. When false, only sets \\Deleted.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_delete_messages");
        return ctx.client.deleteMessages(
          input.mailbox,
          normalizeUids(input.uids),
          input.expunge !== false
        );
      })
  );
