import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "../shared/security-headers";

describe("every API response", () => {
  it("carries the security headers", async () => {
    const response = await exports.default.fetch("https://jotlist.test/api/health");

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(value);
    }
  });

  it("has a CSP that allows Turnstile and LINE profile pictures only", async () => {
    const response = await exports.default.fetch("https://jotlist.test/api/health");
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' https://challenges.cloudflare.com");
    expect(csp).toContain("img-src 'self' data: blob: https://profile.line-scdn.net");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("gets a fresh X-Request-Id", async () => {
    const first = await exports.default.fetch("https://jotlist.test/api/health");
    const second = await exports.default.fetch("https://jotlist.test/api/health");

    expect(first.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.headers.get("X-Request-Id")).not.toBe(second.headers.get("X-Request-Id"));
  });
});

describe("an unknown API route", () => {
  it("returns the shared 404 error shape with a Thai message", async () => {
    const response = await exports.default.fetch("https://jotlist.test/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: expect.stringMatching(/[\u0E00-\u0E7F]/) },
    });
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
