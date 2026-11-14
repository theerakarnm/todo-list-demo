import { env } from "cloudflare:test";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app";
import { handleError } from "../errors";
import { apiAs } from "../test/api";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newTestEmail, signUpVerifiedUser } from "../test/sign-up-user";
import { newId } from "../test/ids";
import { testBrowser } from "../test/test-browser";
import { createTestUser } from "../test/users";
import type { AppEnv } from "../types";
import { requireSession } from "./require-session";

// The real app plus one throwaway route behind the middleware.
const appWithTestRoute = new Hono<AppEnv>()
  .route("/", app)
  .get("/api/test/who-am-i", requireSession, (c) =>
    c.json({ userId: c.var.user.id, email: c.var.user.email, sessionUserId: c.var.session.userId }),
  );
appWithTestRoute.onError(handleError);

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requireSession", () => {
  it("answers 401 UNAUTHORIZED in Thai without a session", async () => {
    const response = await testBrowser({ target: appWithTestRoute }).request("/api/test/who-am-i");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: expect.stringMatching(/[\u0E00-\u0E7F]/) },
    });
  });

  it("puts the signed-in user and session on the context", async () => {
    const email = newTestEmail();
    const browser = await signUpVerifiedUser(internet, email, testBrowser({ target: appWithTestRoute }));

    const response = await browser.request("/api/test/who-am-i");
    const body = await response.json<{ userId: string; email: string; sessionUserId: string }>();

    expect(body.email).toBe(email);
    expect(body.sessionUserId).toBe(body.userId);
  });
});

describe("a signed-in user whose settings row is missing", () => {
  async function userWithoutSettings() {
    const userId = await createTestUser();
    await env.DB.prepare("DELETE FROM user_settings WHERE user_id = ?").bind(userId).run();
    return userId;
  }

  it("can still sync, add a task with a due time and read /api/me, with Bangkok time", async () => {
    const userId = await userWithoutSettings();
    const api = apiAs(userId);

    expect((await api.get("/api/sync")).status).toBe(200);
    const task = { title: "โทรหาแม่", position: "a0", dueDate: "2026-11-20", dueTime: "09:00" };
    expect((await api.put(`/api/tasks/${newId()}`, task)).status).toBe(200);
    const me = await api.get("/api/me");
    expect(me.status).toBe(200);
    expect((await me.json<{ settings: { timezone: string } }>()).settings.timezone).toBe("Asia/Bangkok");
  });
});
