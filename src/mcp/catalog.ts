import { tools as account } from "../tools/account/index.js";
import { tools as send } from "../tools/send/index.js";
import { tools as mailboxes } from "../tools/mailboxes/index.js";
import { tools as messages } from "../tools/messages/index.js";
import { tools as organize } from "../tools/organize/index.js";

export const TOOL_CATALOG = [
  ...account,
  ...send,
  ...mailboxes,
  ...messages,
  ...organize
];

export const TOOL_NAMES = TOOL_CATALOG.map((entry) => entry.name);
