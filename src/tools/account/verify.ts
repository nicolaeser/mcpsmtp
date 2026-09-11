import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";

export const verify = defineTool(
    "smtp_verify",
    "Verify SMTP",
    "Authenticate against the SMTP server and confirm the session can send.",
    z.object({}),
    (ctx) => runTool(ctx, async () => ctx.client.verify())
  );
