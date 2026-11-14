import { env } from "cloudflare:test";
import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleError } from "../errors";
import { createTestUser } from "../test/users";
import type { AppEnv } from "../types";
import { apiRateLimit } from "./api-rate-limit";
import { currentUser } from "./current-user";

function pingApp() {
  const app = new Hono<AppEnv>().use(currentUser, apiRateLimit).get("/api/ping", (c) => c.json({ ok: true }));
  app.onError(handleError);
  return app;
}

afterEach(() => vi.restoreAllMocks());

describe("apiRateLimit", () => {
  it("counts requests per user, not per IP", async () => {
    const userId = await createTestUser();
    const limit = vi.fn(async () => ({ success: true }));

    const response = await pingApp().request(
      "/api/ping",
      { headers: { "x-dev-user-id": userId } },
      { ...env, RATE_LIMIT_API: { limit } },
    );

    expect(response.status).toBe(200);
    expect(limit).toHaveBeenCalledWith({ key: userId });
  });

  it("answers 429 RATE_LIMITED in Thai when the user is over the limit", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const userId = await createTestUser();
    const overLimit = { limit: async () => ({ success: false }) };

    const response = await pingApp().request(
      "/api/ping",
      { headers: { "x-dev-user-id": userId } },
      { ...env, RATE_LIMIT_API: overLimit },
    );

    expect(response.status).toBe(429);
    const body = await response.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.message).toMatch(/[\u0E00-\u0E7F]/);
  });
});
