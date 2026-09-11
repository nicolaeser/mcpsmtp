import {
  MailAccountError,
  type ImapDriver,
  type MailAddress,
  type MailAttachmentMeta,
  type MailboxInfo,
  type MailCredentials,
  type MailMessage,
  type MessageListItem,
  type QuotaInfo,
  type SearchQuery,
  type SendMailInput,
  type SendMailResult,
  type SendRawInput,
  type SmtpDriver,
  type SmtpVerifyResult
} from "./types.js";

export interface MemoryMailMessage {
  uid: number;
  flags: string[];
  date: string;
  subject: string;
  from: MailAddress[];
  to: MailAddress[];
  cc: MailAddress[];
  bcc: MailAddress[];
  replyTo: MailAddress[];
  messageId: string;
  inReplyTo?: string | undefined;
  text: string;
  html?: string | undefined;
  source: string;
  attachments: Array<MailAttachmentMeta & { contentBase64: string }>;
}

interface MemoryMailbox {
  path: string;
  subscribed: boolean;
  specialUse?: string | undefined;
  uidNext: number;
  uidValidity: number;
  messages: MemoryMailMessage[];
}

export class MemoryMailStore implements SmtpDriver, ImapDriver {
  public readonly sent: SendMailResult[] = [];
  public readonly sentInputs: SendMailInput[] = [];
  public verifyOk = true;
  public quotaValue: QuotaInfo | null = {
    path: "INBOX",
    used: 1024,
    limit: 1024 * 1024,
    storageUsed: 1024,
    storageLimit: 1024 * 1024
  };
  private readonly boxes = new Map<string, MemoryMailbox>();

  public constructor(public readonly credentials: MailCredentials) {
    for (const [path, specialUse] of [
      ["INBOX", "\\Inbox"],
      ["Sent", "\\Sent"],
      ["Drafts", "\\Drafts"],
      ["Trash", "\\Trash"],
      ["Junk", "\\Junk"]
    ] as const) {
      this.boxes.set(path, {
        path,
        subscribed: true,
        specialUse,
        uidNext: 1,
        uidValidity: 1,
        messages: []
      });
    }
    this.appendInternal("INBOX", {
      subject: "Welcome",
      from: [{ name: "Mailer", address: "noreply@example.com" }],
      to: [{ address: credentials.fromAddress }],
      text: "Hello from the mailbox.",
      flags: []
    });
    this.appendInternal("INBOX", {
      subject: "Invoice 42",
      from: [{ address: "billing@example.com" }],
      to: [{ address: credentials.fromAddress }],
      text: "Please pay invoice 42.",
      flags: ["\\Seen", "\\Flagged"],
      attachments: [
        {
          filename: "invoice.pdf",
          contentType: "application/pdf",
          size: 4,
          index: 0,
          contentBase64: Buffer.from("%PDF").toString("base64")
        }
      ]
    });
  }

  public async verify(): Promise<SmtpVerifyResult> {
    if (!this.verifyOk) throw new MailAccountError("SMTP authentication failed.", "auth");
    return {
      ok: true,
      host: this.credentials.host,
      port: this.credentials.port,
      security: this.credentials.security
    };
  }

  public async send(input: SendMailInput): Promise<SendMailResult> {
    if (!this.verifyOk) throw new MailAccountError("SMTP authentication failed.", "auth");
    this.sentInputs.push(input);
    const result: SendMailResult = {
      messageId: `<${Date.now()}.${this.sent.length}@memory>`,
      accepted: [...input.to, ...(input.cc ?? []), ...(input.bcc ?? [])],
      rejected: [],
      response: "250 2.0.0 OK"
    };
    this.sent.push(result);
    this.appendInternal("Sent", {
      subject: input.subject,
      from: [{ address: input.from ?? this.credentials.fromAddress }],
      to: input.to.map((address) => ({ address })),
      cc: (input.cc ?? []).map((address) => ({ address })),
      text: input.text ?? "",
      html: input.html,
      flags: ["\\Seen"]
    });
    return result;
  }

  public async sendRaw(input: SendRawInput): Promise<SendMailResult> {
    if (!this.verifyOk) throw new MailAccountError("SMTP authentication failed.", "auth");
    const result: SendMailResult = {
      messageId: `<raw.${Date.now()}@memory>`,
      accepted: [...input.envelopeTo],
      rejected: [],
      response: "250 2.0.0 OK"
    };
    this.sent.push(result);
    return result;
  }

  public async listMailboxes(): Promise<readonly MailboxInfo[]> {
    const items: MailboxInfo[] = [];
    for (const box of this.boxes.values()) {
      items.push({
        path: box.path,
        name: box.path,
        delimiter: "/",
        specialUse: box.specialUse,
        flags: box.specialUse ? [box.specialUse] : [],
        listed: true,
        subscribed: box.subscribed
      });
    }
    return items;
  }

  public async status(path: string) {
    const box = this.requireBox(path);
    let unseen = 0;
    for (const message of box.messages) {
      if (!message.flags.includes("\\Seen")) unseen += 1;
    }
    return {
      path: box.path,
      messages: box.messages.length,
      unseen,
      uidNext: box.uidNext,
      uidValidity: box.uidValidity
    };
  }

  public async createMailbox(path: string) {
    if (this.boxes.has(path)) return { created: false, path };
    this.boxes.set(path, {
      path,
      subscribed: true,
      uidNext: 1,
      uidValidity: 1,
      messages: []
    });
    return { created: true, path };
  }

  public async renameMailbox(path: string, newPath: string) {
    const box = this.requireBox(path);
    this.boxes.delete(path);
    box.path = newPath;
    this.boxes.set(newPath, box);
    return { renamed: true, path, newPath };
  }

  public async deleteMailbox(path: string) {
    this.requireBox(path);
    this.boxes.delete(path);
    return { deleted: true, path };
  }

  public async subscribe(path: string) {
    this.requireBox(path).subscribed = true;
    return { subscribed: true, path };
  }

  public async unsubscribe(path: string) {
    this.requireBox(path).subscribed = false;
    return { subscribed: false, path };
  }

  public async search(query: SearchQuery): Promise<readonly number[]> {
    const uids: number[] = [];
    for (const message of this.matching(query)) uids.push(message.uid);
    return uids;
  }

  public async listMessages(query: SearchQuery): Promise<readonly MessageListItem[]> {
    const items: MessageListItem[] = [];
    for (const message of this.matching(query)) {
      items.push({
        uid: message.uid,
        flags: [...message.flags],
        date: message.date,
        subject: message.subject,
        from: message.from,
        to: message.to,
        messageId: message.messageId,
        size: message.source.length
      });
    }
    return items;
  }

  public async getMessage(path: string, uid: number, options?: { readonly source?: boolean }): Promise<MailMessage> {
    const message = this.requireMessage(path, uid);
    const attachments: MailAttachmentMeta[] = [];
    for (const attachment of message.attachments) {
      attachments.push({
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        cid: attachment.cid,
        index: attachment.index
      });
    }
    return {
      uid: message.uid,
      mailbox: path,
      flags: [...message.flags],
      date: message.date,
      subject: message.subject,
      from: message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      replyTo: message.replyTo,
      messageId: message.messageId,
      inReplyTo: message.inReplyTo,
      text: message.text,
      html: message.html,
      attachments,
      source: options?.source === true ? message.source : undefined
    };
  }

  public async getAttachment(path: string, uid: number, part: string | number) {
    const message = this.requireMessage(path, uid);
    let found;
    if (typeof part === "number") found = message.attachments[part];
    else {
      for (const attachment of message.attachments) {
        if (attachment.filename === part || String(attachment.index) === part || attachment.cid === part) {
          found = attachment;
          break;
        }
      }
    }
    if (found === undefined) {
      throw new MailAccountError(`Attachment ${String(part)} was not found on message ${uid}.`, "not_found");
    }
    return found;
  }

  public async setFlags(path: string, uids: readonly number[], add: readonly string[], remove: readonly string[]) {
    for (const uid of uids) {
      const message = this.requireMessage(path, uid);
      const next = new Set(message.flags);
      for (const flag of add) next.add(flag);
      for (const flag of remove) next.delete(flag);
      message.flags = [...next];
    }
    return { updated: uids.length };
  }

  public async move(path: string, uids: readonly number[], destination: string) {
    const dest = this.requireBox(destination);
    const source = this.requireBox(path);
    let moved = 0;
    for (const uid of uids) {
      const index = source.messages.findIndex((message) => message.uid === uid);
      const message = source.messages[index];
      if (index < 0 || message === undefined) continue;
      source.messages.splice(index, 1);
      message.uid = dest.uidNext++;
      dest.messages.push(message);
      moved += 1;
    }
    return { moved, destination };
  }

  public async copy(path: string, uids: readonly number[], destination: string) {
    const dest = this.requireBox(destination);
    let copied = 0;
    for (const uid of uids) {
      const message = this.requireMessage(path, uid);
      dest.messages.push({
        ...message,
        uid: dest.uidNext++,
        flags: [...message.flags],
        attachments: [...message.attachments]
      });
      copied += 1;
    }
    return { copied, destination };
  }

  public async deleteMessages(path: string, uids: readonly number[], expunge: boolean) {
    const box = this.requireBox(path);
    let deleted = 0;
    for (const uid of uids) {
      const message = this.requireMessage(path, uid);
      if (!message.flags.includes("\\Deleted")) message.flags.push("\\Deleted");
      deleted += 1;
    }
    if (expunge) {
      const kept: MemoryMailMessage[] = [];
      for (const message of box.messages) {
        if (!message.flags.includes("\\Deleted")) kept.push(message);
      }
      box.messages = kept;
    }
    return { deleted, expunged: expunge };
  }

  public async append(path: string, raw: string, flags?: readonly string[]) {
    const subjectMatch = /^Subject:\s*(.*)$/im.exec(raw);
    const stored = this.appendInternal(path, {
      subject: subjectMatch?.[1]?.trim() || "(no subject)",
      from: [{ address: this.credentials.fromAddress }],
      to: [],
      text: raw,
      source: raw,
      flags: flags ? [...flags] : []
    });
    return { path, uid: stored.uid };
  }

  public async expunge(path: string) {
    const box = this.requireBox(path);
    const kept: MemoryMailMessage[] = [];
    for (const message of box.messages) {
      if (!message.flags.includes("\\Deleted")) kept.push(message);
    }
    box.messages = kept;
    return { expunged: true, path };
  }

  public async quota(path?: string): Promise<QuotaInfo | null> {
    if (this.quotaValue === null) return null;
    return { ...this.quotaValue, path: path ?? this.quotaValue.path };
  }

  private matching(query: SearchQuery): MemoryMailMessage[] {
    const box = this.requireBox(query.mailbox);
    const matches: MemoryMailMessage[] = [];
    for (const message of box.messages) {
      if (query.from && !containsAddress(message.from, query.from)) continue;
      if (query.to && !containsAddress(message.to, query.to)) continue;
      if (query.subject && !message.subject.toLowerCase().includes(query.subject.toLowerCase())) continue;
      if (query.text && !message.text.toLowerCase().includes(query.text.toLowerCase())) continue;
      if (query.seen === true && !message.flags.includes("\\Seen")) continue;
      if (query.seen === false && message.flags.includes("\\Seen")) continue;
      if (query.flagged === true && !message.flags.includes("\\Flagged")) continue;
      if (query.flagged === false && message.flags.includes("\\Flagged")) continue;
      if (query.answered === true && !message.flags.includes("\\Answered")) continue;
      if (query.draft === true && !message.flags.includes("\\Draft")) continue;
      if (query.uid) {
        let wanted = false;
        for (const part of query.uid.split(/[,\s]+/)) {
          if (Number(part) === message.uid) {
            wanted = true;
            break;
          }
        }
        if (!wanted) continue;
      }
      matches.push(message);
    }
    matches.sort((a, b) => b.uid - a.uid);
    return matches.slice(query.offset, query.offset + query.limit);
  }

  private requireBox(path: string): MemoryMailbox {
    const box = this.boxes.get(path);
    if (box === undefined) throw new MailAccountError(`Mailbox ${path} was not found.`, "not_found");
    return box;
  }

  private requireMessage(path: string, uid: number): MemoryMailMessage {
    for (const message of this.requireBox(path).messages) {
      if (message.uid === uid) return message;
    }
    throw new MailAccountError(`Message ${uid} was not found in ${path}.`, "not_found");
  }

  private appendInternal(
    path: string,
    input: {
      subject: string;
      from: MailAddress[];
      to: MailAddress[];
      cc?: MailAddress[] | undefined;
      text: string;
      html?: string | undefined;
      source?: string | undefined;
      flags?: string[] | undefined;
      attachments?: Array<MailAttachmentMeta & { contentBase64: string }> | undefined;
    }
  ): MemoryMailMessage {
    const box = this.requireBox(path);
    const uid = box.uidNext++;
    const stored: MemoryMailMessage = {
      uid,
      flags: input.flags ?? [],
      date: new Date().toISOString(),
      subject: input.subject,
      from: input.from,
      to: input.to,
      cc: input.cc ?? [],
      bcc: [],
      replyTo: [],
      messageId: `<mem.${uid}@memory>`,
      text: input.text,
      html: input.html,
      source: input.source ?? `Subject: ${input.subject}\r\n\r\n${input.text}`,
      attachments: input.attachments ?? []
    };
    box.messages.push(stored);
    return stored;
  }
}

function containsAddress(addresses: readonly MailAddress[], needle: string): boolean {
  const lower = needle.toLowerCase();
  for (const item of addresses) {
    if (item.address.toLowerCase().includes(lower)) return true;
  }
  return false;
}
