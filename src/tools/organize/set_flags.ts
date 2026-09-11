import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, normalizeUids, requireConfirm, uidListField } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const setFlags = defineTool(
    "smtp_set_flags",
    "Set flags",
    "Add or remove IMAP flags (\\Seen, \\Flagged, \\Answered, \\Draft). Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField,
      uids: uidListField,
      add: z.array(z.string().min(1)).optional(),
      remove: z.array(z.string().min(1)).optional(),
      seen: z.boolean().optional().describe("true adds \\Seen, false removes it."),
      flagged: z.boolean().optional(),
      answered: z.boolean().optional(),
      draft: z.boolean().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "smtp_set_flags");
        const add = [...(input.add ?? [])];
        const remove = [...(input.remove ?? [])];
        if (input.seen === true) add.push("\\Seen");
        if (input.seen === false) remove.push("\\Seen");
        if (input.flagged === true) add.push("\\Flagged");
        if (input.flagged === false) remove.push("\\Flagged");
        if (input.answered === true) add.push("\\Answered");
        if (input.answered === false) remove.push("\\Answered");
        if (input.draft === true) add.push("\\Draft");
        if (input.draft === false) remove.push("\\Draft");
        if (add.length === 0 && remove.length === 0) {
          throw new Error("Provide add/remove flags or seen/flagged/answered/draft.");
        }
        return ctx.client.setFlags(input.mailbox, normalizeUids(input.uids), add, remove);
      })
  );
