import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload } from "../../mcp/format.js";
import type { SearchQuery } from "../../smtp/types.js";
import { mailboxField, uidField, limitField, offsetField, searchShape, toQuery } from "./helpers.js";

export const listMessages = defineTool(
    "smtp_list_messages",
    "List messages",
    "List message envelopes in a mailbox (UID, flags, from, subject, date, size). Newest first.",
    z.object(searchShape),
    (ctx, input) =>
      runTool(ctx, async () => {
        const query = toQuery(input);
        const items = await ctx.client.listMessages(query);
        return listPayload(items, {
          mailbox: query.mailbox,
          count: items.length,
          limit: query.limit,
          offset: query.offset
        });
      })
  );
