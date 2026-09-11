export type MailSecurity = "none" | "starttls" | "tls";

export interface MailCredentials {
  readonly host: string;
  readonly port: number;
  readonly security: MailSecurity;
  readonly username: string;
  readonly password: string;
  readonly fromAddress: string;
  readonly imapHost: string;
  readonly imapPort: number;
  readonly imapSecurity: MailSecurity;
}

export interface MailAddress {
  readonly name?: string | undefined;
  readonly address: string;
}

export interface SendAttachment {
  readonly filename: string;
  readonly contentBase64: string;
  readonly contentType?: string | undefined;
  readonly cid?: string | undefined;
}

export interface SendMailInput {
  readonly from?: string | undefined;
  readonly to: readonly string[];
  readonly cc?: readonly string[] | undefined;
  readonly bcc?: readonly string[] | undefined;
  readonly replyTo?: string | undefined;
  readonly subject: string;
  readonly text?: string | undefined;
  readonly html?: string | undefined;
  readonly inReplyTo?: string | undefined;
  readonly references?: readonly string[] | undefined;
  readonly headers?: Readonly<Record<string, string>> | undefined;
  readonly attachments?: readonly SendAttachment[] | undefined;
}

export interface SendMailResult {
  readonly messageId: string;
  readonly accepted: readonly string[];
  readonly rejected: readonly string[];
  readonly response?: string | undefined;
}

export interface SendRawInput {
  readonly raw: string;
  readonly envelopeFrom: string;
  readonly envelopeTo: readonly string[];
}

export interface SmtpVerifyResult {
  readonly ok: boolean;
  readonly host: string;
  readonly port: number;
  readonly security: MailSecurity;
}

export interface MailboxInfo {
  readonly path: string;
  readonly name?: string | undefined;
  readonly delimiter?: string | undefined;
  readonly specialUse?: string | undefined;
  readonly flags?: readonly string[] | undefined;
  readonly listed?: boolean | undefined;
  readonly subscribed?: boolean | undefined;
}

export interface MailboxStatus {
  readonly path: string;
  readonly messages?: number | undefined;
  readonly unseen?: number | undefined;
  readonly uidNext?: number | undefined;
  readonly uidValidity?: number | undefined;
}

export interface SearchQuery {
  readonly mailbox: string;
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly subject?: string | undefined;
  readonly text?: string | undefined;
  readonly since?: string | undefined;
  readonly before?: string | undefined;
  readonly seen?: boolean | undefined;
  readonly flagged?: boolean | undefined;
  readonly answered?: boolean | undefined;
  readonly draft?: boolean | undefined;
  readonly uid?: string | undefined;
  readonly limit: number;
  readonly offset: number;
}

export interface MessageListItem {
  readonly uid: number;
  readonly flags: readonly string[];
  readonly date?: string | undefined;
  readonly subject?: string | undefined;
  readonly from?: readonly MailAddress[] | undefined;
  readonly to?: readonly MailAddress[] | undefined;
  readonly messageId?: string | undefined;
  readonly size?: number | undefined;
}

export interface MailAttachmentMeta {
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  readonly cid?: string | undefined;
  readonly index: number;
}

export interface MailAttachmentPayload extends MailAttachmentMeta {
  readonly contentBase64: string;
}

export interface MailMessage {
  readonly uid: number;
  readonly mailbox: string;
  readonly flags: readonly string[];
  readonly date?: string | undefined;
  readonly subject?: string | undefined;
  readonly from?: readonly MailAddress[] | undefined;
  readonly to?: readonly MailAddress[] | undefined;
  readonly cc?: readonly MailAddress[] | undefined;
  readonly bcc?: readonly MailAddress[] | undefined;
  readonly replyTo?: readonly MailAddress[] | undefined;
  readonly messageId?: string | undefined;
  readonly inReplyTo?: string | undefined;
  readonly text?: string | undefined;
  readonly html?: string | undefined;
  readonly attachments: readonly MailAttachmentMeta[];
  readonly source?: string | undefined;
}

export interface QuotaInfo {
  readonly path?: string | undefined;
  readonly used?: number | undefined;
  readonly limit?: number | undefined;
  readonly storageUsed?: number | undefined;
  readonly storageLimit?: number | undefined;
}

export interface SmtpDriver {
  verify(): Promise<SmtpVerifyResult>;
  send(input: SendMailInput): Promise<SendMailResult>;
  sendRaw(input: SendRawInput): Promise<SendMailResult>;
  dispose?(): void;
}

export interface ImapDriver {
  listMailboxes(): Promise<readonly MailboxInfo[]>;
  status(path: string): Promise<MailboxStatus>;
  createMailbox(path: string): Promise<{ readonly created: boolean; readonly path: string }>;
  renameMailbox(
    path: string,
    newPath: string
  ): Promise<{ readonly renamed: boolean; readonly path: string; readonly newPath: string }>;
  deleteMailbox(path: string): Promise<{ readonly deleted: boolean; readonly path: string }>;
  subscribe(path: string): Promise<{ readonly subscribed: boolean; readonly path: string }>;
  unsubscribe(path: string): Promise<{ readonly subscribed: boolean; readonly path: string }>;
  search(query: SearchQuery): Promise<readonly number[]>;
  listMessages(query: SearchQuery): Promise<readonly MessageListItem[]>;
  getMessage(path: string, uid: number, options?: { readonly source?: boolean }): Promise<MailMessage>;
  getAttachment(path: string, uid: number, part: string | number): Promise<MailAttachmentPayload>;
  setFlags(
    path: string,
    uids: readonly number[],
    add: readonly string[],
    remove: readonly string[]
  ): Promise<{ readonly updated: number }>;
  move(
    path: string,
    uids: readonly number[],
    destination: string
  ): Promise<{ readonly moved: number; readonly destination: string }>;
  copy(
    path: string,
    uids: readonly number[],
    destination: string
  ): Promise<{ readonly copied: number; readonly destination: string }>;
  deleteMessages(
    path: string,
    uids: readonly number[],
    expunge: boolean
  ): Promise<{ readonly deleted: number; readonly expunged: boolean }>;
  append(
    path: string,
    raw: string,
    flags?: readonly string[]
  ): Promise<{ readonly path: string; readonly uid?: number | undefined }>;
  expunge(path: string): Promise<{ readonly expunged: boolean; readonly path: string }>;
  quota(path?: string): Promise<QuotaInfo | null>;
  dispose?(): void;
}

export class MailAccountError extends Error {
  public readonly code: string;
  public constructor(message: string, code = "mail_error") {
    super(message);
    this.name = "MailAccountError";
    this.code = code;
  }
}
