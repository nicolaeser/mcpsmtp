import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload } from "../../mcp/format.js";
import type { SearchQuery } from "../../smtp/types.js";
import { mailboxField, uidField, limitField, offsetField, searchShape, toQuery } from "./helpers.js";

export const getMessage = defineTool(
    "smtp_get_message",
    "Get message",
    "Fetch one message by UID: headers, text, HTML, attachment metadata. Set includeSource for raw RFC822.",
    z.object({
      mailbox: mailboxField,
      uid: uidField,
      includeSource: z.boolean().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => ctx.client.getMessage(input.mailbox, input.uid, { source: input.includeSource === true }))
  );
