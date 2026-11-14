import type { BetterAuthOptions } from "better-auth";

const EMAIL_PATTERN = /\S+@\S+/g;

/**
 * Better Auth's own log lines, kept free of personal data: warnings and errors
 * only, the message with any email address masked, and none of the extra
 * details (they can hold user rows or tokens).
 */
export const betterAuthLogger: BetterAuthOptions["logger"] = {
  level: "warn",
  log(level, message) {
    const output = level === "error" ? console.error : console.warn;
    output(JSON.stringify({ level, event: "better-auth", message: message.replace(EMAIL_PATTERN, "<email>") }));
  },
};
