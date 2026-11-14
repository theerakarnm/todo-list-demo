import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { signUpVerifiedUser } from "../test/sign-up-user";
import { type TestBrowser, testBrowser } from "../test/test-browser";

const TABLES_WITH_USER_ID = ["user_settings", "projects", "tasks", "subtasks", "attachments", "push_subscriptions", "session", "account"];

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function userIdOf(browser: TestBrowser) {
  return (await (await browser.request("/api/me")).json<{ user: { id: string } }>()).user.id;
}

/** One project, task, subtask, attachment, push subscription and reset token, plus R2 files. */
async function seedData(userId: string, fileCount = 2) {
  const now = Date.now();
  const [projectId, taskId] = [crypto.randomUUID(), crypto.randomUUID()];
  await env.DB.batch([
    env.DB.prepare("INSERT INTO projects (id, user_id, name, color, position, created_at, updated_at) VALUES (?, ?, 'งาน', 'blue', 'a0', ?, ?)").bind(projectId, userId, now, now),
    env.DB.prepare("INSERT INTO tasks (id, user_id, project_id, title, position, created_at, updated_at) VALUES (?, ?, ?, 'ซื้อนม', 'a0', ?, ?)").bind(taskId, userId, projectId, now, now),
    env.DB.prepare("INSERT INTO subtasks (id, task_id, user_id, title, position, created_at, updated_at) VALUES (?, ?, ?, 'นมจืด', 'a0', ?, ?)").bind(crypto.randomUUID(), taskId, userId, now, now),
    env.DB.prepare("INSERT INTO attachments (id, task_id, user_id, r2_key, mime, bytes, position, created_at) VALUES (?, ?, ?, ?, 'image/webp', 3, 'a0', ?)").bind(crypto.randomUUID(), taskId, userId, `u/${userId}/t/${taskId}/1`, now),
    env.DB.prepare("INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, 'key', 'auth', ?)").bind(crypto.randomUUID(), userId, `https://push.example/${userId}`, now),
    env.DB.prepare("INSERT INTO verification (id, identifier, value, expires_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), `reset-password:${crypto.randomUUID()}`, userId, now + 3600_000),
  ]);
  await Promise.all(
    Array.from({ length: fileCount }, (_, index) => env.FILES.put(`u/${userId}/t/${taskId}/${index}`, "img")),
  );
}

async function rowCounts(userId: string) {
  const counts: Record<string, number> = {};
  for (const table of TABLES_WITH_USER_ID) {
    const row = await env.DB.prepare(`SELECT count(*) AS count FROM ${table} WHERE user_id = ?`).bind(userId).first<{ count: number }>();
    counts[table] = row?.count ?? 0;
  }
  const users = await env.DB.prepare("SELECT count(*) AS count FROM user WHERE id = ?").bind(userId).first<{ count: number }>();
  const tokens = await env.DB.prepare("SELECT count(*) AS count FROM verification WHERE value = ?").bind(userId).first<{ count: number }>();
  return { ...counts, user: users?.count ?? 0, verification: tokens?.count ?? 0 };
}

async function fileCount(userId: string) {
  let count = 0;
  let cursor: string | undefined;
  do {
    const page = await env.FILES.list({ prefix: `u/${userId}/`, cursor });
    count += page.objects.length;
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return count;
}

describe("DELETE /api/account", () => {
  it("answers 401 without a session", async () => {
    const response = await testBrowser().request("/api/account", { method: "DELETE" });

    expect(response.status).toBe(401);
  });

  it("deletes every row and file of the user, and only theirs", async () => {
    const leaving = await signUpVerifiedUser(internet);
    const staying = await signUpVerifiedUser(internet);
    const [leavingId, stayingId] = [await userIdOf(leaving), await userIdOf(staying)];
    await seedData(leavingId);
    await seedData(stayingId);
    const stayingBefore = await rowCounts(stayingId);

    const response = await leaving.request("/api/account", { method: "DELETE" });

    expect(response.status).toBe(204);
    expect(Object.values(await rowCounts(leavingId)).every((count) => count === 0)).toBe(true);
    expect(await fileCount(leavingId)).toBe(0);
    expect(await rowCounts(stayingId)).toEqual(stayingBefore);
    expect(await fileCount(stayingId)).toBe(2);
  });

  it("signs the user out: the cookie is cleared and the old session no longer works", async () => {
    const browser = await signUpVerifiedUser(internet);
    const sessionCookie = [...browser.cookies].find(([name]) => name.includes("session_token"));

    const response = await browser.request("/api/account", { method: "DELETE" });

    const cleared = response.headers.getSetCookie().find((cookie) => cookie.includes("session_token="));
    expect(cleared).toMatch(/Max-Age=0/i);
    const replay = await testBrowser().request("/api/me", {
      headers: { Cookie: `${sessionCookie?.[0]}=${sessionCookie?.[1]}` },
    });
    expect(replay.status).toBe(401);
  });

  it("deletes more files than one R2 list page holds", async () => {
    const browser = await signUpVerifiedUser(internet);
    const userId = await userIdOf(browser);
    await seedData(userId, 1005);

    await browser.request("/api/account", { method: "DELETE" });

    expect(await fileCount(userId)).toBe(0);
  });
});
