import type { LoginBag } from "./auth/fields.js";
import type { SmtpAccountClient } from "./smtp/client.js";

export interface ToolContext {
  readonly client: SmtpAccountClient;
  readonly bag: LoginBag;
  readonly secrets: readonly string[];
}

export type ToolContent = {
  readonly type: "text";
  readonly text: string;
};

export interface ToolResult {
  readonly content: readonly ToolContent[];
  readonly isError?: boolean;
}
