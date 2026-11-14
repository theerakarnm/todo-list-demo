import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "../../shared/constants";
import type { tasks } from "../db/schema";
import { app } from "../app";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { attachmentForm, pngFile, seedAttachments } from "../test/images";
import { insertProject, insertSubtask, seedTasks } from "../test/seed";
import { createTestUser } from "../test/users";

type Task = Omit<typeof tasks.$inferSelect, "userId">;
type ApiError = { error: { code: string; message: string } };

const newTask = (overrides: Record<string, unknown> = {}) => ({ title: "โทรนัดช่างแอร์", position: "a0", ...overrides });

async function createTask(userId: string, overrides: Record<string, unknown> = {}) {
  const id = newId();
  const response = await apiAs(userId).put(`/api/tasks/${id}`, newTask(overrides));
  expect(response.status).toBe(200);
  return bodyOf<Task>(response);
}

function taskRow(id: string) {
  return env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<Record<string, unknown>>();
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("PUT /api/tasks/:id", () => {
  it("creates a task with defaults and server timestamps, without exposing the user id", async () => {
    const userId = await createTestUser();
    const id = newId();
    const before = Date.now();

    const response = await apiAs(userId).put(`/api/tasks/${id}`, newTask());

    expect(response.status).toBe(200);
    const task = await bodyOf<Task & { userId?: string }>(response);
    expect(task).toMatchObject({
      id,
      title: "โทรนัดช่างแอร์",
      notes: "",
      priority: "none",
      projectId: null,
      dueDate: null,
      dueTime: null,
      completedAt: null,
      deletedAt: null,
    });
    expect(task.createdAt).toBeGreaterThanOrEqual(before);
    expect(task.updatedAt).toBe(task.createdAt);
    expect(task.userId).toBeUndefined();
  });

  it("is idempotent: the same id again updates the task instead of adding another", async () => {
    const userId = await createTestUser();
    const first = await createTask(userId);

    const response = await apiAs(userId).put(`/api/tasks/${first.id}`, newTask({ title: "ซื้อนม" }));

    expect(response.status).toBe(200);
    const second = await bodyOf<Task>(response);
    expect(second.title).toBe("ซื้อนม");
    expect(second.createdAt).toBe(first.createdAt);
    const count = await env.DB.prepare("SELECT count(*) AS n FROM tasks WHERE id = ?").bind(first.id).first("n");
    expect(count).toBe(1);
  });

  it("answers 404 for an id owned by another user and leaves their task alone", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const task = await createTask(owner);

    const response = await apiAs(intruder).put(`/api/tasks/${task.id}`, newTask({ title: "แฮก" }));

    expect(response.status).toBe(404);
    expect((await bodyOf<ApiError>(response)).error.code).toBe("NOT_FOUND");
    expect((await taskRow(task.id))?.title).toBe("โทรนัดช่างแอร์");
  });

  it("answers 404 when the project belongs to another user", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const projectId = await insertProject(owner);

    const response = await apiAs(intruder).put(`/api/tasks/${newId()}`, newTask({ projectId }));

    expect(response.status).toBe(404);
  });

  it("rejects an id that is not a UUIDv7", async () => {
    const userId = await createTestUser();

    const response = await apiAs(userId).put(`/api/tasks/${crypto.randomUUID()}`, newTask());

    expect(response.status).toBe(400);
  });

  it("computes remind_at from the due date, due time and the user's time zone", async () => {
    const userId = await createTestUser({ timezone: "Asia/Bangkok" });

    const task = await createTask(userId, { dueDate: "2026-12-01", dueTime: "09:30" });

    expect((await taskRow(task.id))?.remind_at).toBe(Date.UTC(2026, 11, 1, 2, 30));
  });

  it("refuses the 1,001st active task with 409 TASK_LIMIT in Thai", async () => {
    const userId = await createTestUser();
    await seedTasks(userId, 1000);

    const response = await apiAs(userId).put(`/api/tasks/${newId()}`, newTask());

    expect(response.status).toBe(409);
    const body = await bodyOf<ApiError>(response);
    expect(body.error.code).toBe("TASK_LIMIT");
    expect(body.error.message).toContain("1,000");
  });

  it("does not count completed or deleted tasks against the limit", async () => {
    const userId = await createTestUser();
    await seedTasks(userId, 999);
    await seedTasks(userId, 5, { completedAt: Date.now() });

    const response = await apiAs(userId).put(`/api/tasks/${newId()}`, newTask());

    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("changes only the fields it is given and bumps updated_at", async () => {
    const userId = await createTestUser();
    const task = await createTask(userId, { notes: "ก่อนเที่ยง" });

    const response = await apiAs(userId).patch(`/api/tasks/${task.id}`, { priority: "high" });

    expect(response.status).toBe(200);
    const updated = await bodyOf<Task>(response);
    expect(updated).toMatchObject({ priority: "high", notes: "ก่อนเที่ยง", title: task.title });
    expect(updated.updatedAt).toBeGreaterThanOrEqual(task.updatedAt);
  });

  it("completes and un-completes a task", async () => {
    const userId = await createTestUser();
    const task = await createTask(userId);

    const completed = await bodyOf<Task>(await apiAs(userId).patch(`/api/tasks/${task.id}`, { completed: true }));
    expect(completed.completedAt).toEqual(expect.any(Number));

    const reopened = await bodyOf<Task>(await apiAs(userId).patch(`/api/tasks/${task.id}`, { completed: false }));
    expect(reopened.completedAt).toBeNull();
  });

  it("refuses to un-complete a task when 1,000 tasks are already active", async () => {
    const userId = await createTestUser();
    const task = await createTask(userId);
    await apiAs(userId).patch(`/api/tasks/${task.id}`, { completed: true });
    await seedTasks(userId, 1000);

    const response = await apiAs(userId).patch(`/api/tasks/${task.id}`, { completed: false });

    expect(response.status).toBe(409);
    expect((await bodyOf<ApiError>(response)).error.code).toBe("TASK_LIMIT");
    expect((await taskRow(task.id))?.completed_at).not.toBeNull();
  });

  it("puts a task moved to another project at the end of that project", async () => {
    const userId = await createTestUser();
    const projectId = await insertProject(userId);
    await createTask(userId, { projectId, position: "a5" });
    const task = await createTask(userId, { position: "a0" });

    const moved = await bodyOf<Task>(await apiAs(userId).patch(`/api/tasks/${task.id}`, { projectId }));

    expect(moved.projectId).toBe(projectId);
    expect(moved.position > "a5").toBe(true);
  });

  it("recomputes remind_at when the due time changes, and clears it with the date", async () => {
    const userId = await createTestUser({ timezone: "Asia/Bangkok" });
    const task = await createTask(userId, { dueDate: "2026-12-01" });
    await env.DB.prepare("UPDATE tasks SET reminder_sent_at = 1 WHERE id = ?").bind(task.id).run();

    await apiAs(userId).patch(`/api/tasks/${task.id}`, { dueTime: "14:00" });
    const withTime = await taskRow(task.id);
    expect(withTime?.remind_at).toBe(Date.UTC(2026, 11, 1, 7, 0));
    expect(withTime?.reminder_sent_at).toBeNull();

    const cleared = await bodyOf<Task>(await apiAs(userId).patch(`/api/tasks/${task.id}`, { dueDate: null }));
    expect(cleared).toMatchObject({ dueDate: null, dueTime: null, remindAt: null });
  });

  it("rejects a due time on a task without a due date", async () => {
    const userId = await createTestUser();
    const task = await createTask(userId);

    const response = await apiAs(userId).patch(`/api/tasks/${task.id}`, { dueTime: "14:00" });

    expect(response.status).toBe(400);
  });

  it("answers 404 for another user's task and for a deleted task", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const task = await createTask(owner);

    expect((await apiAs(intruder).patch(`/api/tasks/${task.id}`, { title: "แฮก" })).status).toBe(404);

    await apiAs(owner).delete(`/api/tasks/${task.id}`);
    expect((await apiAs(owner).patch(`/api/tasks/${task.id}`, { title: "ใหม่" })).status).toBe(404);
  });
});

describe("DELETE /api/tasks/:id and POST /api/tasks/:id/restore", () => {
  it("soft-deletes a task with its subtasks, and restore brings both back", async () => {
    const userId = await createTestUser();
    const task = await createTask(userId);
    const subtaskId = await insertSubtask(userId, task.id);

    const deleted = await bodyOf<Task>(await apiAs(userId).delete(`/api/tasks/${task.id}`));
    expect(deleted.deletedAt).toEqual(expect.any(Number));
    const deletedSubtask = await env.DB.prepare("SELECT deleted_at FROM subtasks WHERE id = ?").bind(subtaskId).first();
    expect(deletedSubtask?.deleted_at).toBe(deleted.deletedAt);

    const restored = await bodyOf<Task>(await apiAs(userId).post(`/api/tasks/${task.id}/restore`));
    expect(restored.deletedAt).toBeNull();
    const restoredSubtask = await env.DB.prepare("SELECT deleted_at FROM subtasks WHERE id = ?").bind(subtaskId).first();
    expect(restoredSubtask?.deleted_at).toBeNull();
  });

  it("soft-deletes the task's images and keeps their files for Undo; restore brings back only those", async () => {
    const userId = await createTestUser();
    const task = await createTask(userId);
    const upload = () => apiAs(userId).postForm(`/api/tasks/${task.id}/attachments`, attachmentForm(pngFile()));
    const kept = await bodyOf<{ id: string; r2Key: string }>(await upload());
    const deletedEarlier = await bodyOf<{ id: string }>(await upload());
    await apiAs(userId).delete(`/api/attachments/${deletedEarlier.id}`);
    const attachmentRow = (id: string) =>
      env.DB.prepare("SELECT deleted_at, updated_at FROM attachments WHERE id = ?").bind(id).first<Record<string, number | null>>();
    const earlierDeletedAt = (await attachmentRow(deletedEarlier.id))?.deleted_at;

    const deleted = await bodyOf<Task>(await apiAs(userId).delete(`/api/tasks/${task.id}`));
    expect(await attachmentRow(kept.id)).toEqual({ deleted_at: deleted.deletedAt, updated_at: deleted.deletedAt });
    expect(await env.FILES.head(kept.r2Key)).not.toBeNull();

    await apiAs(userId).post(`/api/tasks/${task.id}/restore`);
    expect((await attachmentRow(kept.id))?.deleted_at).toBeNull();
    expect((await attachmentRow(deletedEarlier.id))?.deleted_at).toBe(earlierDeletedAt);
  });

  it("restores the task without its images when they no longer fit in the 200 MB", async () => {
    const userId = await createTestUser();
    const task = await createTask(userId);
    const image = await bodyOf<{ id: string; bytes: number }>(
      await apiAs(userId).postForm(`/api/tasks/${task.id}/attachments`, attachmentForm(pngFile())),
    );
    const deleted = await bodyOf<Task>(await apiAs(userId).delete(`/api/tasks/${task.id}`));
    const otherTask = await createTask(userId);
    await seedAttachments(userId, otherTask.id, 1, { bytes: LIMITS.storageBytesPerUser - image.bytes + 1 });
    await env.DB.prepare("UPDATE attachments SET updated_at = 1000 WHERE id = ?").bind(image.id).run();

    const response = await apiAs(userId).post(`/api/tasks/${task.id}/restore`);

    expect(response.status).toBe(200);
    expect((await bodyOf<Task>(response)).deletedAt).toBeNull();
    const row = await env.DB.prepare("SELECT deleted_at, updated_at FROM attachments WHERE id = ?")
      .bind(image.id)
      .first<{ deleted_at: number | null; updated_at: number }>();
    expect(row?.deleted_at).toBe(deleted.deletedAt);
    // A newer updated_at sends the tombstone again, so a device that put the image back on Undo takes it off.
    expect(row?.updated_at).toBeGreaterThan(1000);
  });

  it("brings a task back into the Inbox when its project was deleted meanwhile", async () => {
    const userId = await createTestUser();
    const projectId = await insertProject(userId);
    const task = await createTask(userId, { projectId });
    await apiAs(userId).delete(`/api/tasks/${task.id}`);
    await env.DB.prepare("UPDATE projects SET deleted_at = ? WHERE id = ?").bind(Date.now(), projectId).run();

    const restored = await bodyOf<Task>(await apiAs(userId).post(`/api/tasks/${task.id}/restore`));

    expect(restored).toMatchObject({ projectId: null, deletedAt: null });
  });

  it("refuses to restore an active task when 1,000 tasks are already active", async () => {
    const userId = await createTestUser();
    const task = await createTask(userId);
    await apiAs(userId).delete(`/api/tasks/${task.id}`);
    await seedTasks(userId, 1000);

    const response = await apiAs(userId).post(`/api/tasks/${task.id}/restore`);

    expect(response.status).toBe(409);
    expect((await bodyOf<ApiError>(response)).error.code).toBe("TASK_LIMIT");
  });

  it("does not let another user delete or restore a task", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const task = await createTask(owner);

    expect((await apiAs(intruder).delete(`/api/tasks/${task.id}`)).status).toBe(404);
    await apiAs(owner).delete(`/api/tasks/${task.id}`);
    expect((await apiAs(intruder).post(`/api/tasks/${task.id}/restore`)).status).toBe(404);
    expect((await taskRow(task.id))?.deleted_at).not.toBeNull();
  });
});

describe("task routes outside development", () => {
  it("answer 401 until lane 1 adds real sign-in", async () => {
    const response = await app.request(`/api/tasks/${newId()}`, { method: "DELETE" }, { ...env, APP_ENV: "production" });

    expect(response.status).toBe(401);
  });
});
