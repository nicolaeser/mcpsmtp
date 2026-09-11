import { ImapFlow, type SearchObject } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import nodemailer, { type SendMailOptions } from "nodemailer";
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
  type SendRawInput,
  type SmtpDriver
} from "./types.js";

const CONNECT_TIMEOUT_MS = 30_000;

export function createNodemailerDriver(credentials: MailCredentials): SmtpDriver {
  const transporter = nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.security === "tls",
    requireTLS: credentials.security === "starttls",
    ignoreTLS: credentials.security === "none",
    auth: { user: credentials.username, pass: credentials.password },
    connectionTimeout: CONNECT_TIMEOUT_MS,
    greetingTimeout: 15_000,
    socketTimeout: CONNECT_TIMEOUT_MS,
    tls: { minVersion: "TLSv1.2" }
  });

  const sent = (info: { messageId?: string; accepted?: unknown; rejected?: unknown; response?: unknown }) => ({
    messageId: info.messageId ?? "",
    accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
    rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
    response: typeof info.response === "string" ? info.response : undefined
  });

  return {
    async verify() {
      try {
        await transporter.verify();
        return {
          ok: true,
          host: credentials.host,
          port: credentials.port,
          security: credentials.security
        };
      } catch (error) {
        throw mapMailError(error, "smtp");
      }
    },
    async send(input: SendMailInput) {
      const mail: SendMailOptions = {
        to: [...input.to],
        subject: input.subject
      };
      if (input.from) mail.from = input.from;
      if (input.cc?.length) mail.cc = [...input.cc];
      if (input.bcc?.length) mail.bcc = [...input.bcc];
      if (input.replyTo) mail.replyTo = input.replyTo;
      if (input.text) mail.text = input.text;
      if (input.html) mail.html = input.html;
      if (input.inReplyTo) mail.inReplyTo = input.inReplyTo;
      if (input.references?.length) mail.references = [...input.references];
      if (input.headers) mail.headers = { ...input.headers };
      if (input.attachments?.length) {
        mail.attachments = input.attachments.map((attachment) => {
          const part: NonNullable<SendMailOptions["attachments"]>[number] = {
            filename: attachment.filename,
            content: Buffer.from(attachment.contentBase64, "base64")
          };
          if (attachment.contentType) part.contentType = attachment.contentType;
          if (attachment.cid) part.cid = attachment.cid;
          return part;
        });
      }
      try {
        return sent(await transporter.sendMail(mail));
      } catch (error) {
        throw mapMailError(error, "smtp");
      }
    },
    async sendRaw(input: SendRawInput) {
      try {
        return sent(
          await transporter.sendMail({
            envelope: { from: input.envelopeFrom, to: [...input.envelopeTo] },
            raw: input.raw
          })
        );
      } catch (error) {
        throw mapMailError(error, "smtp");
      }
    },
    dispose() {
      transporter.close();
    }
  };
}

export function createImapFlowDriver(credentials: MailCredentials): ImapDriver {
  const run = async <T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> => {
    const client = new ImapFlow({
      host: credentials.imapHost,
      port: credentials.imapPort,
      secure: credentials.imapSecurity === "tls",
      auth: { user: credentials.username, pass: credentials.password },
      logger: false,
      tls: { minVersion: "TLSv1.2" }
    });
    try {
      await client.connect();
      return await fn(client);
    } catch (error) {
      throw mapMailError(error, "imap");
    } finally {
      try {
        await client.logout();
      } catch {
        client.close();
      }
    }
  };

  const withMailbox = async <T>(client: ImapFlow, path: string, fn: () => Promise<T>): Promise<T> => {
    const lock = await client.getMailboxLock(path);
    try {
      return await fn();
    } finally {
      lock.release();
    }
  };

  const newestUids = async (client: ImapFlow, query: SearchQuery): Promise<number[]> => {
    const found = await client.search(toSearchObject(query), { uid: true });
    const uids = Array.isArray(found) ? found.filter((uid) => Number.isInteger(uid) && uid > 0) : [];
    uids.sort((a, b) => b - a);
    return uids.slice(query.offset, query.offset + query.limit);
  };

  return {
    listMailboxes: () =>
      run(async (client) => {
        const boxes = await client.list();
        return boxes.map(
          (box): MailboxInfo => ({
            path: box.path,
            name: typeof box.name === "string" ? box.name : undefined,
            delimiter: typeof box.delimiter === "string" ? box.delimiter : undefined,
            specialUse: typeof box.specialUse === "string" ? box.specialUse : undefined,
            flags: [...(box.flags ?? [])],
            listed: box.listed === true,
            subscribed: box.subscribed === true
          })
        );
      }),
    status: (path) =>
      run(async (client) => {
        const status = await client.status(path, {
          messages: true,
          unseen: true,
          uidNext: true,
          uidValidity: true
        });
        return {
          path,
          messages: typeof status.messages === "number" ? status.messages : undefined,
          unseen: typeof status.unseen === "number" ? status.unseen : undefined,
          uidNext: typeof status.uidNext === "number" ? status.uidNext : undefined,
          uidValidity: typeof status.uidValidity === "number" ? status.uidValidity : undefined
        };
      }),
    createMailbox: (path) =>
      run(async (client) => {
        const created = await client.mailboxCreate(path);
        return { created: created.created !== false, path: created.path ?? path };
      }),
    renameMailbox: (path, newPath) =>
      run(async (client) => {
        await client.mailboxRename(path, newPath);
        return { renamed: true, path, newPath };
      }),
    deleteMailbox: (path) =>
      run(async (client) => {
        await client.mailboxDelete(path);
        return { deleted: true, path };
      }),
    subscribe: (path) =>
      run(async (client) => {
        await client.mailboxSubscribe(path);
        return { subscribed: true, path };
      }),
    unsubscribe: (path) =>
      run(async (client) => {
        await client.mailboxUnsubscribe(path);
        return { subscribed: false, path };
      }),
    search: (query) => run(async (client) => withMailbox(client, query.mailbox, () => newestUids(client, query))),
    listMessages: (query) =>
      run(async (client) =>
        withMailbox(client, query.mailbox, async () => {
          const uids = await newestUids(client, query);
          if (uids.length === 0) return [];
          const items: MessageListItem[] = [];
          for await (const msg of client.fetch(
            uids,
            { uid: true, flags: true, envelope: true, size: true, internalDate: true },
            { uid: true }
          )) {
            items.push({
              uid: msg.uid,
              flags: [...(msg.flags ?? [])],
              date: msg.internalDate instanceof Date ? msg.internalDate.toISOString() : undefined,
              subject: typeof msg.envelope?.subject === "string" ? msg.envelope.subject : undefined,
              from: imapAddresses(msg.envelope?.from),
              to: imapAddresses(msg.envelope?.to),
              messageId: typeof msg.envelope?.messageId === "string" ? msg.envelope.messageId : undefined,
              size: typeof msg.size === "number" ? msg.size : undefined
            });
          }
          items.sort((a, b) => b.uid - a.uid);
          return items;
        })
      ),
    getMessage: (path, uid, options) =>
      run(async (client) =>
        withMailbox(client, path, async () => {
          const msg = await client.fetchOne(
            uid,
            { uid: true, flags: true, source: true, envelope: true, internalDate: true },
            { uid: true }
          );
          if (msg === false || msg === undefined || msg.source === undefined) {
            throw new MailAccountError(`Message ${uid} was not found in ${path}.`, "not_found");
          }
          const parsed = await simpleParser(msg.source);
          const source = options?.source === true ? Buffer.from(msg.source).toString("utf8") : undefined;
          return parsedToMessage(path, uid, [...(msg.flags ?? [])], parsed, source);
        })
      ),
    getAttachment: (path, uid, part) =>
      run(async (client) =>
        withMailbox(client, path, async () => {
          const msg = await client.fetchOne(uid, { uid: true, source: true }, { uid: true });
          if (msg === false || msg === undefined || msg.source === undefined) {
            throw new MailAccountError(`Message ${uid} was not found in ${path}.`, "not_found");
          }
          const attachments = (await simpleParser(msg.source)).attachments ?? [];
          let found;
          let index = 0;
          if (typeof part === "number") {
            found = attachments[part];
            index = part;
          } else {
            index = attachments.findIndex(
              (attachment, i) => attachment.filename === part || String(i) === part || attachment.cid === part
            );
            found = index >= 0 ? attachments[index] : undefined;
          }
          if (found === undefined || found.content === undefined) {
            throw new MailAccountError(`Attachment ${String(part)} was not found on message ${uid}.`, "not_found");
          }
          const content = Buffer.isBuffer(found.content) ? found.content : Buffer.from(String(found.content));
          return {
            filename: found.filename ?? `attachment-${String(part)}`,
            contentType: found.contentType ?? "application/octet-stream",
            size: content.length,
            cid: typeof found.cid === "string" && found.cid.length > 0 ? found.cid : undefined,
            index,
            contentBase64: content.toString("base64")
          };
        })
      ),
    setFlags: (path, uids, add, remove) =>
      run(async (client) =>
        withMailbox(client, path, async () => {
          if (uids.length === 0) return { updated: 0 };
          if (add.length > 0) await client.messageFlagsAdd([...uids], [...add], { uid: true });
          if (remove.length > 0) await client.messageFlagsRemove([...uids], [...remove], { uid: true });
          return { updated: uids.length };
        })
      ),
    move: (path, uids, destination) =>
      run(async (client) =>
        withMailbox(client, path, async () => {
          if (uids.length === 0) return { moved: 0, destination };
          await client.messageMove([...uids], destination, { uid: true });
          return { moved: uids.length, destination };
        })
      ),
    copy: (path, uids, destination) =>
      run(async (client) =>
        withMailbox(client, path, async () => {
          if (uids.length === 0) return { copied: 0, destination };
          await client.messageCopy([...uids], destination, { uid: true });
          return { copied: uids.length, destination };
        })
      ),
    deleteMessages: (path, uids, expunge) =>
      run(async (client) =>
        withMailbox(client, path, async () => {
          if (uids.length === 0) return { deleted: 0, expunged: expunge };
          if (expunge) await client.messageDelete([...uids], { uid: true });
          else await client.messageFlagsAdd([...uids], ["\\Deleted"], { uid: true });
          return { deleted: uids.length, expunged: expunge };
        })
      ),
    append: (path, raw, flags) =>
      run(async (client) => {
        const result = await client.append(path, Buffer.from(raw, "utf8"), flags ? [...flags] : undefined);
        if (result === false) throw new MailAccountError(`Could not append to ${path}.`, "mail_error");
        return { path, uid: typeof result.uid === "number" ? result.uid : undefined };
      }),
    expunge: (path) =>
      run(async (client) =>
        withMailbox(client, path, async () => {
          await client.messageDelete({ deleted: true }, { uid: true });
          return { expunged: true, path };
        })
      ),
    quota: (path) =>
      run(async (client) => {
        try {
          const quota = await client.getQuota(path ?? "INBOX");
          if (quota === false || quota == null) return null;
          return quotaToInfo(quota, path);
        } catch {
          return null;
        }
      })
  };
}

function toSearchObject(query: SearchQuery): SearchObject {
  const out: SearchObject = {};
  if (query.from) out.from = query.from;
  if (query.to) out.to = query.to;
  if (query.subject) out.subject = query.subject;
  if (query.text) out.body = query.text;
  if (query.since) out.since = new Date(query.since);
  if (query.before) out.before = new Date(query.before);
  if (query.seen !== undefined) out.seen = query.seen;
  if (query.flagged !== undefined) out.flagged = query.flagged;
  if (query.answered !== undefined) out.answered = query.answered;
  if (query.draft === true) out.draft = true;
  if (query.uid) out.uid = query.uid;
  if (Object.keys(out).length === 0) out.all = true;
  return out;
}

function imapAddresses(
  value: ReadonlyArray<{ name?: string | null | undefined; address?: string | null | undefined }> | undefined
): MailAddress[] | undefined {
  if (value === undefined) return undefined;
  const out: MailAddress[] = [];
  for (const item of value) {
    const address = (item.address ?? "").trim();
    if (!address) continue;
    const name = (item.name ?? "").trim();
    out.push(name ? { name, address } : { address });
  }
  return out.length > 0 ? out : undefined;
}

function parsedAddresses(value: AddressObject | AddressObject[] | undefined): MailAddress[] | undefined {
  if (value === undefined) return undefined;
  const groups = Array.isArray(value) ? value : [value];
  const out: MailAddress[] = [];
  for (const group of groups) {
    for (const item of group.value) {
      const address = (item.address ?? "").trim();
      if (!address) continue;
      const name = (item.name ?? "").trim();
      out.push(name ? { name, address } : { address });
    }
  }
  return out.length > 0 ? out : undefined;
}

function parsedToMessage(
  mailbox: string,
  uid: number,
  flags: readonly string[],
  parsed: ParsedMail,
  source: string | undefined
): MailMessage {
  const attachments: MailAttachmentMeta[] = [];
  for (const [index, attachment] of (parsed.attachments ?? []).entries()) {
    const content: unknown = attachment.content;
    attachments.push({
      filename: attachment.filename ?? `attachment-${index}`,
      contentType: attachment.contentType ?? "application/octet-stream",
      size: Buffer.isBuffer(content) ? content.length : typeof content === "string" ? content.length : 0,
      cid: typeof attachment.cid === "string" && attachment.cid.length > 0 ? attachment.cid : undefined,
      index
    });
  }
  return {
    uid,
    mailbox,
    flags,
    date: parsed.date instanceof Date ? parsed.date.toISOString() : undefined,
    subject: typeof parsed.subject === "string" ? parsed.subject : undefined,
    from: parsedAddresses(parsed.from),
    to: parsedAddresses(parsed.to),
    cc: parsedAddresses(parsed.cc),
    bcc: parsedAddresses(parsed.bcc),
    replyTo: parsedAddresses(parsed.replyTo),
    messageId: typeof parsed.messageId === "string" ? parsed.messageId : undefined,
    inReplyTo: typeof parsed.inReplyTo === "string" ? parsed.inReplyTo : undefined,
    text: typeof parsed.text === "string" ? parsed.text : undefined,
    html: typeof parsed.html === "string" ? parsed.html : undefined,
    attachments,
    source
  };
}

function quotaToInfo(quota: unknown, path: string | undefined): QuotaInfo {
  if (quota === null || typeof quota !== "object") return { path };
  const record = quota as Record<string, unknown>;
  const storage =
    record.storage !== undefined && typeof record.storage === "object" && record.storage !== null
      ? (record.storage as Record<string, unknown>)
      : record;
  const used = typeof storage.usage === "number" ? storage.usage : typeof storage.used === "number" ? storage.used : undefined;
  const limit = typeof storage.limit === "number" ? storage.limit : undefined;
  return { path, used, storageUsed: used, limit, storageLimit: limit };
}

export function mapMailError(error: unknown, channel: "smtp" | "imap"): MailAccountError {
  if (error instanceof MailAccountError) return error;
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.replace(/(pass(?:word)?\s*[=:]\s*)\S+/gi, "$1[REDACTED]").slice(0, 400);
  if (/auth|invalid credentials|535|534|LOGIN failed|AUTHENTICATIONFAILED/i.test(message)) {
    return new MailAccountError(
      channel === "smtp" ? "SMTP authentication failed." : "IMAP authentication failed.",
      "auth"
    );
  }
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|certificate|SSL|TLS/i.test(message)) {
    return new MailAccountError(`Could not reach the ${channel.toUpperCase()} server.`, "network");
  }
  return new MailAccountError(message.length > 0 ? message : `${channel.toUpperCase()} request failed.`, "mail_error");
}
