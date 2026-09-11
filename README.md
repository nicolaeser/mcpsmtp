# mcpsmtp

MCP SMTP. Stdio or HTTP at `/mcp`.

```sh
mcpsmtp
mcpsmtp http
```

HTTP is OAuth. Secrets stay on this host.

Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURITY`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, `IMAP_HOST`, `IMAP_PORT`, `IMAP_SECURITY`, `MCP_OAUTH_SECRET`, `MCP_PUBLIC_URL`, `MCP_AUTH_PASSWORD`.

`main` publishes GHCR `:latest`. `development` publishes `:dev`.

### Connection page

The consent page identifies the requesting application and explains this connector’s purpose.
Only account details needed for sign-in are shown upfront; optional settings expand on demand.
Server access, when required, is a separate step. Light and dark themes follow your device.
SMTP and IMAP ports accept a suggested port or a custom number in the same field. Leaving them empty uses 587 and 993; security is inferred from the port unless selected explicitly.
