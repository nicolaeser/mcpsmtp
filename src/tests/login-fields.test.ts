import { describe, expect, it } from "vitest";
import { collectLoginBag } from "../auth/fields.js";
import { credentialsFromBag, loginFields } from "../auth/login-fields.js";
import { isAllowedRedirect } from "../auth/redirects.js";
import { readRuntimeConfig } from "../config.js";

describe("SMTP login fields", () => {
  it("collects host, selected port, security, username, and password", () => {
    const names = loginFields().map((field) => field.name);
    expect(names).toEqual([
      "host",
      "port",
      "portCustom",
      "security",
      "username",
      "password",
      "fromAddress",
      "imapHost",
      "imapPort",
      "imapPortCustom",
      "imapSecurity"
    ]);
    expect(loginFields().find((field) => field.name === "host")?.secret).toBe(false);
    expect(loginFields().find((field) => field.name === "port")?.type).toBe("combobox");
    expect(loginFields().find((field) => field.name === "security")?.type).toBe("select");
    expect(loginFields().find((field) => field.name === "password")?.secret).toBe(true);
    const result = collectLoginBag(
      loginFields(),
      {
        host: " smtp.example.test ",
        port: "587",
        security: "starttls",
        username: "  mail-user@example.test ",
        password: "  hunter2! "
      },
      {}
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.bag.secrets.password).toBe("hunter2!");
    expect(result.bag.claims.host).toBe("smtp.example.test");
    expect(result.bag.claims.username).toBe("mail-user@example.test");
    expect(credentialsFromBag(result.bag, {})).toEqual({
      host: "smtp.example.test",
      port: 587,
      security: "starttls",
      username: "mail-user@example.test",
      password: "hunter2!",
      fromAddress: "mail-user@example.test",
      imapHost: "smtp.example.test",
      imapPort: 993,
      imapSecurity: "tls"
    });
  });

  it("lets a custom port override the selected SMTP and IMAP ports", () => {
    const result = collectLoginBag(
      loginFields(),
      {
        host: "mail.example.test",
        port: "587",
        portCustom: "1025",
        security: "none",
        username: "local",
        password: "pw",
        imapHost: "imap.example.test",
        imapPort: "993",
        imapPortCustom: "1143",
        imapSecurity: "starttls",
        fromAddress: "local@example.test"
      },
      {}
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(credentialsFromBag(result.bag, {})).toMatchObject({
      port: 1025,
      security: "none",
      imapHost: "imap.example.test",
      imapPort: 1143,
      imapSecurity: "starttls",
      fromAddress: "local@example.test"
    });
  });

  it("fills from SMTP_* and IMAP_* env when the form is empty", () => {
    const result = collectLoginBag(
      loginFields(),
      {},
      {
        SMTP_HOST: "env-smtp.example",
        SMTP_PORT: "465",
        SMTP_SECURITY: "tls",
        SMTP_USERNAME: "env-user",
        SMTP_PASSWORD: "env-secret",
        SMTP_FROM: "from@example",
        IMAP_HOST: "env-imap.example",
        IMAP_PORT: "993",
        IMAP_SECURITY: "tls"
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.bag.secrets).toEqual({ password: "env-secret" });
    expect(credentialsFromBag(result.bag, {})).toMatchObject({
      host: "env-smtp.example",
      port: 465,
      security: "tls",
      username: "env-user",
      fromAddress: "from@example",
      imapHost: "env-imap.example"
    });
  });

  it("reads SMTP_* in runtime config", () => {
    const config = readRuntimeConfig({
      SMTP_HOST: "alias-host",
      SMTP_USERNAME: "alias-user",
      SMTP_PASSWORD: "alias-pass",
      SMTP_PORT: "2525",
      MCPSMTP_PORT: "4000"
    });
    expect(config.smtpHost).toBe("alias-host");
    expect(config.username).toBe("alias-user");
    expect(config.password).toBe("alias-pass");
    expect(config.smtpPort).toBe("2525");
    expect(config.http.port).toBe(4000);
  });
});

describe("redirect allowlist", () => {
  it("allows Grok, Cursor loopback, and the Cursor native callback", () => {
    expect(isAllowedRedirect("https://grok.com/connectors-oauth-exchange-code/")).toBe(true);
    expect(isAllowedRedirect("http://localhost:8787/callback")).toBe(true);
    expect(isAllowedRedirect("cursor://anysphere.cursor-mcp/oauth/callback")).toBe(true);
    expect(isAllowedRedirect("cursor://evil.example/oauth/callback")).toBe(false);
  });
});
