import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { createTestUser } from "../test/users";

type Page = {
  tasks: { id: string; completedAt: number }[];
  next: { before: number; beforeId: string } | null;
};

/** Completed tasks with real UUIDv7 ids (the cursor needs them); half share one completed_at. */
async function seedCompletedTasks(userId: string, count: number) {
  const sharedCompletedAt = Date.now() - 60_000;
  const insert = env.DB.prepare(
    "INSERT INTO tasks (id, user_id, title, position, completed_at, created_at, updated_at) VALUES (?, ?, 'เสร็จแล้ว', 'a0', ?, ?, ?)",
  );
  const rows = Array.from({ length: count }, (_, i) => {
    const completedAt = i % 2 === 0 ? sharedCompletedAt : sharedCompletedAt - i * 1000;
    return insert.bind(newId(), userId, completedAt, completedAt, completedAt);
  });
  await env.DB.batch(rows);
}

async function page(userId: string, next?: Page["next"]) {
  const query = next ? `?before=${next.before}&beforeId=${next.beforeId}` : "";
  const response = await apiAs(userId).get(`/api/logbook${query}`);
  expect(response.status).toBe(200);
  return bodyOf<Page>(response);
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("GET /api/logbook", () => {
  it("pages through completed tasks newest first, 50 at a time, without gaps or repeats", async () => {
    const userId = await createTestUser();
    await seedCompletedTasks(userId, 120);

    const first = await page(userId);
    const second = await page(userId, first.next);
    const third = await page(userId, second.next);

    expect([first.tasks.length, second.tasks.length, third.tasks.length]).toEqual([50, 50, 20]);
    expect(third.next).toBeNull();
    const all = [...first.tasks, ...second.tasks, ...third.tasks];
    expect(new Set(all.map((task) => task.id)).size).toBe(120);
    const completedTimes = all.map((task) => task.completedAt);
    expect(completedTimes).toEqual([...completedTimes].sort((a, b) => b - a));
  });

  it("leaves out active and deleted tasks", async () => {
    const userId = await createTestUser();
    const doneId = newId();
    const deletedId = newId();
    const activeId = newId();
    await apiAs(userId).put(`/api/tasks/${doneId}`, { title: "เสร็จ", position: "a0" });
    await apiAs(userId).put(`/api/tasks/${deletedId}`, { title: "เสร็จแล้วลบ", position: "a0" });
    await apiAs(userId).put(`/api/tasks/${activeId}`, { title: "ยังทำอยู่", position: "a0" });
    await apiAs(userId).patch(`/api/tasks/${doneId}`, { completed: true });
    await apiAs(userId).patch(`/api/tasks/${deletedId}`, { completed: true });
    await apiAs(userId).delete(`/api/tasks/${deletedId}`);

    const body = await page(userId);

    expect(body.tasks.map((task) => task.id)).toEqual([doneId]);
    expect(body.next).toBeNull();
  });

  it("never shows another user's completed tasks", async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    await seedCompletedTasks(otherUserId, 3);

    expect((await page(userId)).tasks).toEqual([]);
  });

  it("can show one project's completed tasks only", async () => {
    const userId = await createTestUser();
    const projectId = newId();
    const inProjectId = newId();
    const inboxId = newId();
    await apiAs(userId).put(`/api/projects/${projectId}`, { name: "งาน", position: "a0" });
    await apiAs(userId).put(`/api/tasks/${inProjectId}`, { title: "ในโปรเจกต์", position: "a0", projectId });
    await apiAs(userId).put(`/api/tasks/${inboxId}`, { title: "ในกล่อง", position: "a0" });
    await apiAs(userId).patch(`/api/tasks/${inProjectId}`, { completed: true });
    await apiAs(userId).patch(`/api/tasks/${inboxId}`, { completed: true });

    const response = await apiAs(userId).get(`/api/logbook?projectId=${projectId}`);

    expect((await bodyOf<Page>(response)).tasks.map((task) => task.id)).toEqual([inProjectId]);
  });
});
