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

  it("inserts the row on the first request", async () => {
    const userId = await userWithoutSettings();

    const statements = await statementsPreparedDuring(() => apiAs(userId).get("/api/sync"));

    expect(writesToUserSettings(statements)).toEqual([expect.stringMatching(/^\s*insert/i)]);
    const row = await env.DB.prepare("SELECT timezone FROM user_settings WHERE user_id = ?").bind(userId).first();
    expect(row).not.toBeNull();
  });
});

describe("a signed-in user whose settings row exists", () => {
  it("costs no INSERT or UPDATE on user_settings, only the read", async () => {
    const userId = await createTestUser();
    await env.DB.prepare("UPDATE user_settings SET display_name = ?, timezone = ? WHERE user_id = ?")
      .bind("ชื่อใหม่", "Asia/Tokyo", userId)
      .run();

    const statements = await statementsPreparedDuring(async () => {
      expect((await apiAs(userId).get("/api/sync")).status).toBe(200);
    });

    // The read shows the spy sees the Worker's own statements, so the empty list below means something.
    expect(statements.some((sql) => /^\s*select\b[\s\S]*\bfrom\s+"?user_settings"?/i.test(sql))).toBe(true);
    expect(writesToUserSettings(statements)).toEqual([]);
    const row = await env.DB.prepare("SELECT display_name, timezone FROM user_settings WHERE user_id = ?").bind(userId).first();
    expect(row).toEqual({ display_name: "ชื่อใหม่", timezone: "Asia/Tokyo" });
  });
});

/** The SQL of every statement prepared on D1 while `run` runs. */
async function statementsPreparedDuring(run: () => Promise<unknown>) {
  const prepare = vi.spyOn(env.DB, "prepare");
  try {
    await run();
    return prepare.mock.calls.map(([sql]) => sql);
  } finally {
    prepare.mockRestore();
  }
}

function writesToUserSettings(statements: string[]) {
  return statements.filter((sql) => /^\s*(insert\s+into|update)\s+"?user_settings"?/i.test(sql));
}
