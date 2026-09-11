import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, normalizeUids, requireConfirm, uidListField } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const expunge = defineTool(
    "smtp_expunge",
    "Expunge mailbox",
    "Permanently remove messages flagged \\Deleted. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_expunge");
        return ctx.client.expunge(input.mailbox);
      })
  );
