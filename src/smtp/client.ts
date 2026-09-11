import {
  MailAccountError,
  type ImapDriver,
  type MailCredentials,
  type MailMessage,
  type SearchQuery,
  type SendMailInput,
  type SmtpDriver
} from "./types.js";
import { createImapFlowDriver, createNodemailerDriver } from "./drivers.js";

export interface MailAccountOptions extends MailCredentials {
  readonly smtp?: SmtpDriver | undefined;
  readonly imap?: ImapDriver | undefined;
}

export type SmtpClientFactory = (options: MailAccountOptions) => SmtpAccountClient;

export const defaultClientFactory: SmtpClientFactory = (options) => new SmtpAccountClient(options);

export class SmtpAccountClient {
  public readonly credentials: MailCredentials;
  private readonly smtpDriver: SmtpDriver;
  private readonly imapDriver: ImapDriver;

  public constructor(options: MailAccountOptions) {
    const { smtp, imap, ...credentials } = options;
    this.credentials = credentials;
    this.smtpDriver = smtp ?? createNodemailerDriver(credentials);
    this.imapDriver = imap ?? createImapFlowDriver(credentials);
  }

  public secretValues(): readonly string[] {
    return this.credentials.password.length > 0 ? [this.credentials.password] : [];
  }

  public whoami(): Omit<MailCredentials, "password"> {
    const { password: _password, ...publicCreds } = this.credentials;
    return publicCreds;
  }

  public verify() {
    return this.smtpDriver.verify();
  }

  public send(input: SendMailInput) {
    const from = input.from?.trim() || this.credentials.fromAddress;
    if (!from) throw new MailAccountError("From address is required.", "config");
    if (input.to.length === 0) throw new MailAccountError("At least one To recipient is required.", "config");
    if (!input.text && !input.html) throw new MailAccountError("Provide text and/or html body.", "config");
    return this.smtpDriver.send({ ...input, from });
  }

  public sendRaw(input: Parameters<SmtpDriver["sendRaw"]>[0]) {
    return this.smtpDriver.sendRaw(input);
  }

  public listMailboxes() {
    return this.imapDriver.listMailboxes();
  }

  public mailboxStatus(path: string) {
    return this.imapDriver.status(path);
  }

  public createMailbox(path: string) {
    return this.imapDriver.createMailbox(path);
  }

  public renameMailbox(path: string, newPath: string) {
    return this.imapDriver.renameMailbox(path, newPath);
  }

  public deleteMailbox(path: string) {
    return this.imapDriver.deleteMailbox(path);
  }

  public subscribeMailbox(path: string) {
    return this.imapDriver.subscribe(path);
  }

  public unsubscribeMailbox(path: string) {
    return this.imapDriver.unsubscribe(path);
  }

  public searchMessages(query: SearchQuery) {
    return this.imapDriver.search(query);
  }

  public listMessages(query: SearchQuery) {
    return this.imapDriver.listMessages(query);
  }

  public getMessage(path: string, uid: number, options?: { readonly source?: boolean }): Promise<MailMessage> {
    return this.imapDriver.getMessage(path, uid, options);
  }

  public getAttachment(path: string, uid: number, part: string | number) {
    return this.imapDriver.getAttachment(path, uid, part);
  }

  public setFlags(path: string, uids: readonly number[], add: readonly string[], remove: readonly string[]) {
    return this.imapDriver.setFlags(path, uids, add, remove);
  }

  public moveMessages(path: string, uids: readonly number[], destination: string) {
    return this.imapDriver.move(path, uids, destination);
  }

  public copyMessages(path: string, uids: readonly number[], destination: string) {
    return this.imapDriver.copy(path, uids, destination);
  }

  public deleteMessages(path: string, uids: readonly number[], expunge: boolean) {
    return this.imapDriver.deleteMessages(path, uids, expunge);
  }

  public appendMessage(path: string, raw: string, flags?: readonly string[]) {
    return this.imapDriver.append(path, raw, flags);
  }

  public expunge(path: string) {
    return this.imapDriver.expunge(path);
  }

  public quota(path?: string) {
    return this.imapDriver.quota(path);
  }

  public dispose(): void {
    this.smtpDriver.dispose?.();
    this.imapDriver.dispose?.();
  }
}
