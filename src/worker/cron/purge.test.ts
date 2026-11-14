import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb } from "../db/client";
import { runCronAt } from "../test/cron";
import { newId } from "../test/ids";
import { createTestUser } from "../test/users";
import { purgeDeletedRows } from "./purge";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

type Table = "projects" | "tasks" | "subtasks" | "attachments";

async function insertProject(userId: string, deletedAt: number | null) {
  const id = newId();
  await env.DB.prepare(
    "INSERT INTO projects (id, user_id, name, color, position, created_at, updated_at, deleted_at) VALUES (?, ?, 'งาน', 'blue', 'a0', 0, 0, ?)",
  )
    .bind(id, userId, deletedAt)
    .run();
  return id;
}

async function insertTask(userId: string, deletedAt: number | null, projectId: string | null = null) {
  const id = newId();
  await env.DB.prepare(
    "INSERT INTO tasks (id, user_id, project_id, title, position, created_at, updated_at, deleted_at) VALUES (?, ?, ?, 'งาน', 'a0', 0, 0, ?)",
  )
    .bind(id, userId, projectId, deletedAt)
    .run();
  return id;
}

async function insertSubtask(userId: string, taskId: string, deletedAt: number | null) {
  const id = newId();
  await env.DB.prepare(
    "INSERT INTO subtasks (id, task_id, user_id, title, position, created_at, updated_at, deleted_at) VALUES (?, ?, ?, 'ย่อย', 'a0', 0, 0, ?)",
  )
    .bind(id, taskId, userId, deletedAt)
    .run();
  return id;
}

/** An attachment row and its R2 object, as the upload route stores them. */
async function insertAttachment(userId: string, taskId: string, deletedAt: number | null) {
  const id = newId();
  const key = `u/${userId}/t/${taskId}/${id}`;
  await env.FILES.put(key, "image bytes");
  await env.DB.prepare(
    "INSERT INTO attachments (id, task_id, user_id, r2_key, mime, bytes, position, created_at, deleted_at) VALUES (?, ?, ?, ?, 'image/webp', 11, 'a0', 0, ?)",
  )
    .bind(id, taskId, userId, key, deletedAt)
    .run();
  return { id, key };
}

async function exists(table: Table, id: string) {
  return (await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(id).first()) !== null;
}

async function fileExists(key: string) {
  return (await env.FILES.head(key)) !== null;
}

// Each test uses its own UTC day: the purge remembers the last day it ran.
const threeAmUtc = (day: number) => Date.UTC(2027, 0, day, 3, 0);

describe("the daily purge cron", () => {
  it("hard-deletes rows soft-deleted more than 7 days ago, with their R2 objects", async () => {
    const now = threeAmUtc(10);
    const old = now - 7 * DAY - HOUR;
    const userId = await createTestUser();

    const oldProject = await insertProject(userId, old);
    const taskInOldProject = await insertTask(userId, old, oldProject);
    const subtaskOfOldTask = await insertSubtask(userId, taskInOldProject, old);
    const fileOfOldTask = await insertAttachment(userId, taskInOldProject, old);
    const liveTask = await insertTask(userId, null);
    const oldSubtask = await insertSubtask(userId, liveTask, old);
    const oldFile = await insertAttachment(userId, liveTask, old);

    await runCronAt(now);

    expect(await exists("projects", oldProject)).toBe(false);
    expect(await exists("tasks", taskInOldProject)).toBe(false);
    expect(await exists("subtasks", subtaskOfOldTask)).toBe(false);
    expect(await exists("attachments", fileOfOldTask.id)).toBe(false);
    expect(await fileExists(fileOfOldTask.key)).toBe(false);
    expect(await exists("subtasks", oldSubtask)).toBe(false);
    expect(await exists("attachments", oldFile.id)).toBe(false);
    expect(await fileExists(oldFile.key)).toBe(false);
    expect(await exists("tasks", liveTask)).toBe(true);
  });

  it("keeps rows that are not deleted or were deleted within 7 days, and their R2 objects", async () => {
    const now = threeAmUtc(11);
    const recent = now - 7 * DAY + HOUR;
    const userId = await createTestUser();

    const liveProject = await insertProject(userId, null);
    const recentProject = await insertProject(userId, recent);
    const recentTask = await insertTask(userId, recent, recentProject);
    const recentSubtask = await insertSubtask(userId, recentTask, recent);
    const recentFile = await insertAttachment(userId, recentTask, recent);
    const liveTask = await insertTask(userId, null, liveProject);
    const liveSubtask = await insertSubtask(userId, liveTask, null);
    const liveFile = await insertAttachment(userId, liveTask, null);
    // Deleting a project cascades to its tasks, so a project a kept task still points to must stay.
    const oldProject = await insertProject(userId, now - 30 * DAY);
    const recentTaskInOldProject = await insertTask(userId, recent, oldProject);

    await runCronAt(now);

    for (const [table, id] of [
      ["projects", oldProject],
      ["tasks", recentTaskInOldProject],
      ["projects", liveProject],
      ["projects", recentProject],
      ["tasks", recentTask],
      ["subtasks", recentSubtask],
      ["attachments", recentFile.id],
      ["tasks", liveTask],
      ["subtasks", liveSubtask],
      ["attachments", liveFile.id],
    ] as const) {
      expect(await exists(table, id), `${table} ${id}`).toBe(true);
    }
    expect(await fileExists(recentFile.key)).toBe(true);
    expect(await fileExists(liveFile.key)).toBe(true);
  });

  it("waits until 03:00 UTC", async () => {
    const now = threeAmUtc(12);
    const userId = await createTestUser();
    const oldTask = await insertTask(userId, now - 30 * DAY);

    await runCronAt(now - 60_000);

    expect(await exists("tasks", oldTask)).toBe(true);
  });

  it("runs at most once per UTC day", async () => {
    const now = threeAmUtc(13);
    const userId = await createTestUser();
    await runCronAt(now);
    const oldTask = await insertTask(userId, now - 30 * DAY);

    await runCronAt(now + HOUR);
    expect(await exists("tasks", oldTask)).toBe(true);

    await runCronAt(now + DAY);
    expect(await exists("tasks", oldTask)).toBe(false);
  });
});

/** env.FILES, recording the keys of every delete call. */
function recordingFiles() {
  const deleteCalls: string[][] = [];
  const files = {
    delete: (keys: string[]) => {
      deleteCalls.push(keys);
      return env.FILES.delete(keys);
    },
  } as unknown as R2Bucket;
  return { files, deleteCalls };
}

describe("the daily purge in pages", () => {
  it("deletes R2 objects and rows a page at a time until every old row is gone", async () => {
    const now = threeAmUtc(20);
    const old = now - 7 * DAY - HOUR;
    const userId = await createTestUser();
    const liveTask = await insertTask(userId, null);
    const oldFiles = [];
    for (let i = 0; i < 5; i++) oldFiles.push(await insertAttachment(userId, liveTask, old));
    const oldSubtasks = [];
    for (let i = 0; i < 3; i++) oldSubtasks.push(await insertSubtask(userId, liveTask, old));
    const oldTasks = [];
    for (let i = 0; i < 3; i++) oldTasks.push(await insertTask(userId, old));
    const liveFile = await insertAttachment(userId, liveTask, null);
    const recentFile = await insertAttachment(userId, liveTask, now - DAY);
    const { files, deleteCalls } = recordingFiles();

    const counts = await purgeDeletedRows(createDb(env.DB), files, now, { pageSize: 2, pagesPerRun: 20 });

    expect(counts).toMatchObject({ attachments: 5, subtasks: 3, tasks: 3 });
    expect(deleteCalls.map((keys) => keys.length)).toEqual([2, 2, 1]);
    for (const file of oldFiles) {
      expect(await exists("attachments", file.id)).toBe(false);
      expect(await fileExists(file.key)).toBe(false);
    }
    for (const id of oldSubtasks) expect(await exists("subtasks", id)).toBe(false);
    for (const id of oldTasks) expect(await exists("tasks", id)).toBe(false);
    for (const file of [liveFile, recentFile]) {
      expect(await exists("attachments", file.id)).toBe(true);
      expect(await fileExists(file.key)).toBe(true);
    }
    expect(await exists("tasks", liveTask)).toBe(true);
  });

  it("stops after its pages for this run and finishes on the next run the same day", async () => {
    const now = threeAmUtc(21);
    const userId = await createTestUser();
    const liveTask = await insertTask(userId, null);
    const oldFiles = [];
    for (let i = 0; i < 5; i++) oldFiles.push(await insertAttachment(userId, liveTask, now - 30 * DAY));
    const oldTask = await insertTask(userId, now - 30 * DAY);
    const db = createDb(env.DB);

    await purgeDeletedRows(db, env.FILES, now, { pageSize: 2, pagesPerRun: 2 });

    const left = [];
    for (const file of oldFiles) if (await exists("attachments", file.id)) left.push(file);
    expect(left).toHaveLength(1);
    expect(await exists("tasks", oldTask)).toBe(true);

    await purgeDeletedRows(db, env.FILES, now + 60_000, { pageSize: 2, pagesPerRun: 20 });

    expect(await exists("attachments", left[0]?.id ?? "")).toBe(false);
    expect(await fileExists(left[0]?.key ?? "")).toBe(false);
    expect(await exists("tasks", oldTask)).toBe(false);
    expect(await purgeDeletedRows(db, env.FILES, now + 120_000)).toBeNull();
  });
});
