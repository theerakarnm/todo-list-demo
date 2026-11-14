import { env } from "cloudflare:test";
import { exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SECURITY_HEADERS } from "../shared/security-headers";
import { app } from "./app";
import { createTestUser } from "./test/users";

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

// Every route the app has, except the ones a signed-out visitor needs.
const PUBLIC_PREFIXES = ["/api/auth/", "/api/health", "/api/config"];
const signedInRoutes = [
  ...new Set(
    app.routes
      .filter(({ method, path }) => method !== "ALL" && !PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix)))
      .map(({ method, path }) => `${method} ${path.replaceAll(":id", "019a8c3e-1f2a-7b3c-8d4e-5f6a7b8c9d0e")}`),
  ),
].map((route) => route.split(" ") as [string, string]);

describe.each(["development", "production"])("every signed-in route with APP_ENV=%s", (appEnv) => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(signedInRoutes)("%s %s answers 401 UNAUTHORIZED without a session", async (method, path) => {
    const response = await app.request(path, { method }, { ...env, APP_ENV: appEnv });

    expect(response.status).toBe(401);
    expect((await response.json<{ error: { code: string } }>()).error.code).toBe("UNAUTHORIZED");
  });

  it("ignores the old x-dev-user-id header", async () => {
    const userId = await createTestUser();

    const response = await app.request(
      "/api/sync",
      { headers: { "x-dev-user-id": userId } },
      { ...env, APP_ENV: appEnv },
    );

    expect(response.status).toBe(401);
  });
});
