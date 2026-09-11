import type { LoginField } from "./fields.js";
import type { MailCredentials, MailSecurity } from "../smtp/types.js";

export function loginFields(): readonly LoginField[] {
  return [
    {
      name: "host",
      label: "SMTP host",
      type: "text",
      required: true,
      secret: false,
      envFallback: "SMTP_HOST",
      prompt: "if-missing",
      autocomplete: "off",
      placeholder: "smtp.example.com",
      help: "Your outgoing mail server, for example smtp.example.com. Do not include https://.",
    },
    {
      name: "port",
      placeholder: "587",
      pattern: "(?:[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])",
      inputmode: "numeric",
      section: "Outgoing server settings",
      label: "SMTP port",
      type: "combobox",
      required: false,
      secret: false,
      envFallback: "SMTP_PORT",
      prompt: "if-missing",
      options: [
        { value: "587", label: "587 (STARTTLS submission)" },
        { value: "465", label: "465 (SSL/TLS)" },
        { value: "25", label: "25 (SMTP)" },
        { value: "2525", label: "2525 (alternate submission)" }
      ],
      help: "Choose a suggested port or enter any port from 1 to 65535. Default: 587.",
    },
    {
      name: "portCustom",
      label: "Custom SMTP port",
      type: "text",
      required: false,
      secret: false,
      prompt: "never",
      placeholder: "leave empty to use the selected port",
      help: "Optional. Overrides SMTP port when set (1–65535)."
    },
    {
      name: "security",
      section: "Outgoing server settings",
      label: "SMTP security",
      type: "select",
      required: false,
      secret: false,
      envFallback: "SMTP_SECURITY",
      prompt: "if-missing",
      options: [
        { value: "starttls", label: "STARTTLS" },
        { value: "tls", label: "SSL/TLS" },
        { value: "none", label: "None" }
      ],
      help: "Automatic by default: TLS on port 465, STARTTLS otherwise. No encryption is only for trusted local test servers.",
    },
    {
      name: "username",
      label: "Username",
      type: "text",
      required: true,
      secret: false,
      envFallback: "SMTP_USERNAME",
      prompt: "if-missing",
      autocomplete: "username",
      placeholder: "you@example.com"
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      secret: true,
      envFallback: "SMTP_PASSWORD",
      prompt: "if-missing",
      autocomplete: "current-password",
      placeholder: "mailbox or app password",
      help: "Use your mailbox password or a provider app password.",
    },
    {
      name: "fromAddress",
      section: "Sender address",
      label: "From address",
      type: "text",
      required: false,
      secret: false,
      envFallback: "SMTP_FROM",
      prompt: "if-missing",
      autocomplete: "email",
      placeholder: "you@example.com",
      help: "Default From. Falls back to the username when it looks like an email."
    },
    {
      name: "imapHost",
      section: "Incoming server settings",
      label: "IMAP host",
      type: "text",
      required: false,
      secret: false,
      envFallback: "IMAP_HOST",
      prompt: "if-missing",
      autocomplete: "off",
      placeholder: "imap.example.com",
      help: "Enter a separate incoming mail server if needed. Otherwise, the SMTP host is used.",
    },
    {
      name: "imapPort",
      placeholder: "993",
      pattern: "(?:[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])",
      inputmode: "numeric",
      section: "Incoming server settings",
      label: "IMAP port",
      type: "combobox",
      required: false,
      secret: false,
      envFallback: "IMAP_PORT",
      prompt: "if-missing",
      options: [
        { value: "993", label: "993 (SSL/TLS)" },
        { value: "143", label: "143 (STARTTLS)" }
      ],
      help: "Choose a suggested port or enter any port from 1 to 65535. Default: 993.",
    },
    {
      name: "imapPortCustom",
      label: "Custom IMAP port",
      type: "text",
      required: false,
      secret: false,
      prompt: "never",
      placeholder: "leave empty to use the selected port",
      help: "Optional. Overrides IMAP port when set (1–65535)."
    },
    {
      name: "imapSecurity",
      section: "Incoming server settings",
      label: "IMAP security",
      type: "select",
      required: false,
      secret: false,
      envFallback: "IMAP_SECURITY",
      prompt: "if-missing",
      options: [
        { value: "tls", label: "SSL/TLS" },
        { value: "starttls", label: "STARTTLS" },
        { value: "none", label: "None" }
      ],
      help: "Automatic by default: STARTTLS on port 143, TLS otherwise.",
    }
  ];
}

export interface MailEnv {
  readonly host?: string | undefined;
  readonly port?: string | undefined;
  readonly portCustom?: string | undefined;
  readonly security?: string | undefined;
  readonly username?: string | undefined;
  readonly password?: string | undefined;
  readonly fromAddress?: string | undefined;
  readonly imapHost?: string | undefined;
  readonly imapPort?: string | undefined;
  readonly imapPortCustom?: string | undefined;
  readonly imapSecurity?: string | undefined;
}

export function credentialsFromBag(
  bag: {
    readonly secrets: Readonly<Record<string, string>>;
    readonly claims?: Readonly<Record<string, string>>;
  },
  env: MailEnv = {}
): MailCredentials | undefined {
  const claims = bag.claims ?? {};
  const host = normalizeHost(claims.host ?? env.host ?? "");
  const username = (claims.username ?? env.username ?? "").trim();
  const password = bag.secrets.password ?? env.password ?? "";
  if (host.length === 0 || username.length === 0 || password.length === 0) return undefined;

  const portCustom = (claims.portCustom ?? env.portCustom ?? "").trim();
  const portSelected = (claims.port ?? env.port ?? "").trim();
  const port = parsePortValue(portCustom.length > 0 ? portCustom : portSelected, 587);

  const security = parseSecurity(
    claims.security ?? env.security,
    port === 465 ? "tls" : "starttls"
  );

  const fromRaw = (claims.fromAddress ?? env.fromAddress ?? "").trim();
  const fromAddress = fromRaw || (username.includes("@") ? username : `${username}@${host}`);

  const imapHostRaw = (claims.imapHost ?? env.imapHost ?? "").trim();
  const imapHost = imapHostRaw.length > 0 ? normalizeHost(imapHostRaw) : host;

  const imapPortCustom = (claims.imapPortCustom ?? env.imapPortCustom ?? "").trim();
  const imapPortSelected = (claims.imapPort ?? env.imapPort ?? "").trim();
  const imapPort = parsePortValue(
    imapPortCustom.length > 0 ? imapPortCustom : imapPortSelected,
    993
  );

  const imapSecurity = parseSecurity(
    claims.imapSecurity ?? env.imapSecurity,
    imapPort === 143 ? "starttls" : "tls"
  );

  return {
    host,
    port,
    security,
    username,
    password,
    fromAddress,
    imapHost,
    imapPort,
    imapSecurity
  };
}

function normalizeHost(value: string): string {
  let host = value.trim();
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  host = host.replace(/\/.*$/, "");
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end > 0) return host.slice(1, end);
  }
  const colon = host.lastIndexOf(":");
  if (colon > 0 && /^\d+$/.test(host.slice(colon + 1))) {
    host = host.slice(0, colon);
  }
  return host.trim();
}

function parsePortValue(value: string, fallback: number): number {
  if (value.length === 0) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return fallback;
  return n;
}

function parseSecurity(value: string | undefined, fallback: MailSecurity): MailSecurity {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "tls" || raw === "ssl" || raw === "ssl/tls") return "tls";
  if (raw === "starttls") return "starttls";
  if (raw === "none" || raw === "plain" || raw === "off") return "none";
  return fallback;
}
