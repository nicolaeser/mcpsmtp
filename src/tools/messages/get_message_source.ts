import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload } from "../../mcp/format.js";
import type { SearchQuery } from "../../smtp/types.js";
import { mailboxField, uidField, limitField, offsetField, searchShape, toQuery } from "./helpers.js";

export const getMessageSource = defineTool(
    "smtp_get_message_source",
    "Get message source",
    "Fetch the raw RFC822 source of one message by UID.",
    z.object({
      mailbox: mailboxField,
      uid: uidField
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const message = await ctx.client.getMessage(input.mailbox, input.uid, { source: true });
        return { uid: message.uid, mailbox: message.mailbox, source: message.source ?? "" };
      })
  );
