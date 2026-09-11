# Architecture

Load this document when choosing which layer a change belongs in.

This package is a hostable MCP server. Stdio is the local process transport. HTTP is Streamable
HTTP at `/mcp` plus OAuth at `/authorize`, `/token`, `/register`, and RFC 9728 metadata.

## Entry points

- `src/index.ts` — CLI: stdio by default, `http` for the listener.
- `src/http-main.ts` — HTTP process. Refuses passwords on argv.
- `src/transport/stdio.ts` — stdio MCP. Uses env credentials. Must not speak OAuth.
- `src/transport/http.ts` — Express app, session map, Host allowlist, health.
- `src/auth/routes.ts` — OAuth HTTP surface and consent POST.
- `src/mcp/server.ts` and `src/mcp/catalog.ts` — MCP server and tool catalog.
- `src/auth/login-fields.ts` — the only login-question customization point.
- `src/smtp/client.ts` — SMTP/IMAP account client. Nodemailer sends; ImapFlow reads/organizes.

## Facts that are easy to get wrong

- HTTP Bearer must be an `mcp1.` session token from this host. The mailbox password is not a
  connector credential.
- Tool handlers receive mail credentials from the sealed login bag, never from the client.
- `tsup.config.ts` regenerates `src/mcp/catalog.ts` on build from `src/tools/*/index.ts`.
