import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newTestEmail, PASSES_TURNSTILE, TEST_PASSWORD } from "../test/sign-up-user";
import { testBrowser } from "../test/test-browser";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const protectedRequests = [
  ["sign-up", "/api/auth/sign-up/email", () => ({ name: "a", email: newTestEmail(), password: TEST_PASSWORD })],
  ["forgot password", "/api/auth/request-password-reset", () => ({ email: newTestEmail() })],
] as const;

describe.each(protectedRequests)("Turnstile on %s", (_name, path, body) => {
  it("answers 400 TURNSTILE_FAILED in Thai without a token, and sends no email", async () => {
    const response = await testBrowser().postJson(path, body());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "TURNSTILE_FAILED", message: expect.stringMatching(/[\u0E00-\u0E7F]/) },
    });
    expect(internet.sentEmails).toHaveLength(0);
  });

  it("answers 400 TURNSTILE_FAILED when Cloudflare rejects the token", async () => {
    const response = await testBrowser().postJson(path, body(), { "x-turnstile-token": "bot-token" });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "TURNSTILE_FAILED" } });
  });

  it("lets a request with a passing token through", async () => {
    const response = await testBrowser().postJson(path, body(), PASSES_TURNSTILE);

    expect(response.status).toBe(200);
  });
});

describe("GET /api/config", () => {
  it("gives the client the public Turnstile site key", async () => {
    const response = await testBrowser().request("/api/config");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ turnstileSiteKey: "test-turnstile-site-key" });
  });
});
