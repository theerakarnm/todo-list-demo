import { afterEach, describe, expect, it, vi } from "vitest";
import { createBetterAuthLogger } from "./better-auth-logger";

afterEach(() => vi.restoreAllMocks());

function logLine(message: string, requestId = "req-1") {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  createBetterAuthLogger(requestId)?.log?.("warn", message);
  return String(warn.mock.calls[0]?.[0]);
}

describe("createBetterAuthLogger", () => {
  it("never writes a reset link or its token", () => {
    const line = logLine("Reset link: https://jotlist.test/reset-password?token=abc123DEF456ghi789JKL012mno345");

    expect(line).not.toContain("jotlist.test");
    expect(line).not.toContain("abc123DEF456");
  });

  it("masks emails", () => {
    expect(logLine("No user for somchai@example.com")).not.toContain("somchai@example.com");
  });

  it("masks long token-like strings", () => {
    expect(logLine("session abcdefghij0123456789_-ABCDEF failed")).not.toContain("abcdefghij0123456789");
  });

  it("puts the request id on the line", () => {
    expect(JSON.parse(logLine("boom", "req-42"))).toMatchObject({ event: "better-auth", requestId: "req-42", message: "boom" });
  });
});
