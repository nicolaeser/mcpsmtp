import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { envFromConfig } from "../auth/resolve.js";
import { readRuntimeConfig } from "../config.js";
import { createMcpServer } from "../mcp/server.js";
import type { SmtpClientFactory } from "../smtp/client.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";

export interface StdioRunOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly createClient?: SmtpClientFactory;
}

export async function runStdio(options: StdioRunOptions = {}): Promise<void> {
  const env = options.env ?? process.env;
  const config = readRuntimeConfig(env);
  const mailEnv = envFromConfig(config);
  const password = config.password;
  const claims: Record<string, string> = {};
  for (const key of ["host", "port", "security", "username", "fromAddress", "imapHost", "imapPort", "imapSecurity"] as const) {
    const value = mailEnv[key];
    if (value) claims[key] = value;
  }
  const serverMcp = createMcpServer({
    getToken: () => password,
    getBag: () => ({
      secrets: password ? { password } : {},
      claims
    }),
    createClient: options.createClient,
    ...mailEnv
  });
  const transport = new StdioServerTransport();
  await serverMcp.connect(transport);
  process.stderr.write(`${PACKAGE_NAME}/${PACKAGE_VERSION} listening on stdio\n`);
}
