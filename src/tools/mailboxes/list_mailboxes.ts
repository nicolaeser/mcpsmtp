import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, listPayload, requireConfirm } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const listMailboxes = defineTool(
    "smtp_list_mailboxes",
    "List mailboxes",
    "List IMAP folders including special-use (Inbox, Sent, Drafts, Trash, Junk) when advertised.",
    z.object({}),
    (ctx) =>
      runTool(ctx, async () => {
        const items = await ctx.client.listMailboxes();
        return listPayload(items, { count: items.length });
      })
  );
