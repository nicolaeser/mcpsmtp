import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import {
  confirmField,
  normalizeRecipients,
  recipientsField,
  requireConfirm
} from "../../mcp/format.js";
import type { SendMailInput } from "../../smtp/types.js";

export const attachmentSchema = z.object({
  filename: z.string().min(1),
  contentBase64: z.string().min(1),
  contentType: z.string().optional(),
  cid: z.string().optional()
});
