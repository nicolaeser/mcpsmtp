import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";

export const whoami = defineTool(
    "smtp_whoami",
    "Who am I",
    "Show the connected SMTP/IMAP host, ports, security, username, and default From. Secrets are never returned.",
    z.object({}),
    (ctx) => runTool(ctx, async () => ctx.client.whoami())
  );
