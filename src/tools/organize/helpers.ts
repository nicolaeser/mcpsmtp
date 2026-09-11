import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, normalizeUids, requireConfirm, uidListField } from "../../mcp/format.js";

export const mailboxField = z.string().min(1).default("INBOX").describe("IMAP mailbox path. Default INBOX.");
