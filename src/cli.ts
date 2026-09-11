export function cliMode(argv: readonly string[]): "stdio" | "http" {
  return argv[0] === "http" || argv.includes("--http") ? "http" : "stdio";
}

export function wantsHelp(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

export function tokenOnArgv(argv: readonly string[]): boolean {
  return argv.some((arg) => arg.startsWith("--token") || arg === "-t" || arg.startsWith("--password"));
}

export const HELP = `mcpsmtp

  mcpsmtp         stdio
  mcpsmtp http    Streamable HTTP at /mcp

HTTP defaults to OAuth. Mail host, username, and password stay on this host.
`;
