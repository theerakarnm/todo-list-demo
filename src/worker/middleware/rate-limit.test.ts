import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { signUpVerifiedUser } from "../test/sign-up-user";
import { testBrowser, testEnv } from "../test/test-browser";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A fake Rate Limiting binding that records the keys it is asked about. */
function fakeRateLimit(success: boolean) {
  return { limit: vi.fn(async (_options: { key: string }) => ({ success })) };
}

const rateLimitedBody = {
  error: { code: "RATE_LIMITED", message: "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
};

describe("auth rate limit (20 requests/min per IP)", () => {
  it("answers 429 RATE_LIMITED in Thai when the IP is over the limit", async () => {
    const browser = testBrowser({ bindings: { ...testEnv, RATE_LIMIT_AUTH: fakeRateLimit(false) } });

    const response = await browser.postJson("/api/auth/sign-in/email", { email: "a@example.com", password: "x" });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual(rateLimitedBody);
  });

  it("counts requests by the client IP and lets them through under the limit", async () => {
    const limiter = fakeRateLimit(true);
    const browser = testBrowser({ bindings: { ...testEnv, RATE_LIMIT_AUTH: limiter } });

    const response = await browser.request("/api/auth/get-session", { headers: { "CF-Connecting-IP": "203.0.113.7" } });

    expect(response.status).toBe(200);
    expect(limiter.limit).toHaveBeenCalledWith({ key: "203.0.113.7" });
  });
});

describe("API rate limit (120 requests/min per user)", () => {
  it("answers 429 RATE_LIMITED when the user is over the limit", async () => {
    const browser = await signUpVerifiedUser(internet);
    const overLimit = testBrowser({ bindings: { ...testEnv, RATE_LIMIT_API: fakeRateLimit(false) } });
    for (const [name, value] of browser.cookies) overLimit.cookies.set(name, value);

    const response = await overLimit.request("/api/me");

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual(rateLimitedBody);
  });

  it("counts requests by user id and lets them through under the limit", async () => {
    const browser = await signUpVerifiedUser(internet);
    const limiter = fakeRateLimit(true);
    const counted = testBrowser({ bindings: { ...testEnv, RATE_LIMIT_API: limiter } });
    for (const [name, value] of browser.cookies) counted.cookies.set(name, value);

    const response = await counted.request("/api/me");

    expect(response.status).toBe(200);
    const { user } = await response.json<{ user: { id: string } }>();
    expect(limiter.limit).toHaveBeenCalledWith({ key: user.id });
  });

  it("does not count requests without a session", async () => {
    const limiter = fakeRateLimit(true);

    await testBrowser({ bindings: { ...testEnv, RATE_LIMIT_API: limiter } }).request("/api/me");

    expect(limiter.limit).not.toHaveBeenCalled();
  });
});
