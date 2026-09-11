import { listMailboxes } from "./list_mailboxes.js";
import { getMailbox } from "./get_mailbox.js";
import { createMailbox } from "./create_mailbox.js";
import { renameMailbox } from "./rename_mailbox.js";
import { deleteMailbox } from "./delete_mailbox.js";
import { subscribeMailbox } from "./subscribe_mailbox.js";
import { unsubscribeMailbox } from "./unsubscribe_mailbox.js";

export const tools = [
  listMailboxes,
  getMailbox,
  createMailbox,
  renameMailbox,
  deleteMailbox,
  subscribeMailbox,
  unsubscribeMailbox
];
