import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";

export const getQuota = defineTool(
    "smtp_get_quota",
    "Mailbox quota",
    "IMAP STORAGE quota when the server supports RFC 2087. Returns null when unsupported.",
    z.object({
      mailbox: z.string().optional().describe("Mailbox path. Default INBOX.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => ctx.client.quota(input.mailbox?.trim() || "INBOX"))
  );
