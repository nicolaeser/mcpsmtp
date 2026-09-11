import { searchMessages } from "./search_messages.js";
import { listMessages } from "./list_messages.js";
import { getMessage } from "./get_message.js";
import { getMessageSource } from "./get_message_source.js";
import { getAttachment } from "./get_attachment.js";

export const tools = [
  searchMessages,
  listMessages,
  getMessage,
  getMessageSource,
  getAttachment
];
