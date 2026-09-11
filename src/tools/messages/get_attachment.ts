import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload } from "../../mcp/format.js";
import type { SearchQuery } from "../../smtp/types.js";
import { mailboxField, uidField, limitField, offsetField, searchShape, toQuery } from "./helpers.js";

export const getAttachment = defineTool(
    "smtp_get_attachment",
    "Get attachment",
    "Download one attachment from a message. Identify it by filename, cid, or zero-based index.",
    z.object({
      mailbox: mailboxField,
      uid: uidField,
      part: z.union([z.string().min(1), z.number().int().min(0)])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const attachment = await ctx.client.getAttachment(input.mailbox, input.uid, input.part);
        return filePayload(
          {
            filename: attachment.filename,
            mimeType: attachment.contentType,
            base64Encoded: true,
            content: attachment.contentBase64
          },
          {
            uid: input.uid,
            mailbox: input.mailbox,
            index: attachment.index,
            cid: attachment.cid,
            size: attachment.size
          }
        );
      })
  );
