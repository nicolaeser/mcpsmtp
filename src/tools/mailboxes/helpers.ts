import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, listPayload, requireConfirm } from "../../mcp/format.js";

export const mailboxField = z.string().min(1).describe("IMAP mailbox path, for example INBOX or INBOX/Archive.");
