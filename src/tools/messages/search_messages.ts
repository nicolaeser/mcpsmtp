import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload } from "../../mcp/format.js";
import type { SearchQuery } from "../../smtp/types.js";
import { mailboxField, uidField, limitField, offsetField, searchShape, toQuery } from "./helpers.js";

export const searchMessages = defineTool(
    "smtp_search_messages",
    "Search messages",
    "IMAP SEARCH. Returns matching UIDs, newest first, capped by limit/offset.",
    z.object(searchShape),
    (ctx, input) =>
      runTool(ctx, async () => {
        const query = toQuery(input);
        const uids = await ctx.client.searchMessages(query);
        return { mailbox: query.mailbox, uids, count: uids.length };
      })
  );
