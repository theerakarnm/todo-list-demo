import type { BetterAuthOptions } from "better-auth";

const EMAIL_PATTERN = /\S+@\S+/g;
const URL_PATTERN = /https?:\/\/\S+/g;
// Session tokens, reset tokens and the like: 20 or more URL-safe characters in a row.
const TOKEN_PATTERN = /[A-Za-z0-9_-]{20,}/g;

function redact(message: string) {
  return message.replace(URL_PATTERN, "<url>").replace(EMAIL_PATTERN, "<email>").replace(TOKEN_PATTERN, "<token>");
}

/**
 * Better Auth's own log lines, kept free of personal data: warnings and errors
 * only, the message with URLs, emails and tokens masked, and none of the extra
 * details (they can hold user rows or tokens). Each line carries the request id.
 */
export function createBetterAuthLogger(requestId?: string): BetterAuthOptions["logger"] {
  return {
    level: "warn",
    log(level, message) {
      const output = level === "error" ? console.error : console.warn;
      output(JSON.stringify({ level, event: "better-auth", requestId, message: redact(message) }));
    },
  };
}
