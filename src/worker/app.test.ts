import { env } from "cloudflare:test";
import { exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { SECURITY_HEADERS } from "../shared/security-headers";
import { app } from "./app";

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

describe("the data routes outside development", () => {
  // Until lane 1 adds real sign-in, nobody is signed in in production.
  it.each([
    ["GET", "/api/sync"],
    ["GET", "/api/logbook"],
    ["GET", "/api/search?q=x"],
    ["PUT", "/api/projects/019a8c3e-1f2a-7b3c-8d4e-5f6a7b8c9d0e"],
    ["DELETE", "/api/subtasks/019a8c3e-1f2a-7b3c-8d4e-5f6a7b8c9d0e"],
    ["POST", "/api/tasks/reschedule-overdue"],
  ])("%s %s answers 401", async (method, path) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await app.request(path, { method }, { ...env, APP_ENV: "production" });

    expect(response.status).toBe(401);
    vi.restoreAllMocks();
  });
});
