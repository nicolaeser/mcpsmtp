import { setFlags } from "./set_flags.js";
import { moveMessages } from "./move_messages.js";
import { copyMessages } from "./copy_messages.js";
import { deleteMessages } from "./delete_messages.js";
import { expunge } from "./expunge.js";
import { appendMessage } from "./append_message.js";

export const tools = [
  setFlags,
  moveMessages,
  copyMessages,
  deleteMessages,
  expunge,
  appendMessage
];
