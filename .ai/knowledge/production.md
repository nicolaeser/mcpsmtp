# Production

Load this document for Docker, compose, bind addresses, or production env.

`src/auth/production.ts` fail-closes HTTP when the process is exposed or `NODE_ENV=production`.

## Required on a non-loopback bind

- Stable `MCP_OAUTH_SECRET` of at least 32 characters. An ephemeral secret invalidates sessions
  across restarts and is refused in production.
- `MCP_PUBLIC_URL` set to the public origin without `/mcp`. Host checks and token audience use it.
  `X-Forwarded-Host` is not trusted when this is unset.
- `MCP_AUTH_PASSWORD` unless `MCP_ALLOW_OPEN_CONSENT=1` on a trusted isolated network.

`docker-compose.yml` pulls `ghcr.io/<owner>/<repo>:latest` with hardcoded env.
`docker-compose.dev.yml` builds from `context: .` with hardcoded env and `MCP_ALLOW_OPEN_CONSENT=1`.

The image runs as `node`, binds `0.0.0.0:8080`, and serves `/health`. Do not pass secrets on
argv. Do not commit `.env` or `tokens.json`. OAuth and MCP sessions persist in `/var/lib/mcp/sessions.sqlite` on the `./data:/var/lib/mcp` bind mount. Rows are AES-256-GCM sealed with `MCP_OAUTH_SECRET`. Without
that secret, nothing is written. Do not commit `.env`, `tokens.json`, or `sessions.sqlite`.

Pushes to `main` publish GHCR `:latest`. Pushes to `development` publish `:dev`.
