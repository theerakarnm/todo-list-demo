import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { subtasks } from "../db/schema";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { seedSubtasks } from "../test/seed";
import { createTestUser } from "../test/users";

type Subtask = Omit<typeof subtasks.$inferSelect, "userId">;
type ApiError = { error: { code: string; message: string } };

async function createTask(userId: string) {
  const id = newId();
  const response = await apiAs(userId).put(`/api/tasks/${id}`, { title: "ล้างแอร์", position: "a0" });
  expect(response.status).toBe(200);
  return id;
}

async function createSubtask(userId: string, taskId: string) {
  const id = newId();
  const response = await apiAs(userId).put(`/api/subtasks/${id}`, { taskId, title: "ซื้อน้ำยา", position: "a0" });
  expect(response.status).toBe(200);
  return bodyOf<Subtask>(response);
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("PUT /api/subtasks/:id", () => {
  it("adds a subtask to the user's task, and the same id again updates it", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);
    const subtask = await createSubtask(userId, taskId);
    expect(subtask).toMatchObject({ taskId, title: "ซื้อน้ำยา", completedAt: null, deletedAt: null });

    const response = await apiAs(userId).put(`/api/subtasks/${subtask.id}`, { taskId, title: "ซื้อท่อ", position: "a1" });

    expect(await bodyOf<Subtask>(response)).toMatchObject({ id: subtask.id, title: "ซื้อท่อ", position: "a1" });
    const count = await env.DB.prepare("SELECT count(*) AS n FROM subtasks WHERE id = ?").bind(subtask.id).first("n");
    expect(count).toBe(1);
  });

  it("answers 404 for a task of another user", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const taskId = await createTask(owner);

    const response = await apiAs(intruder).put(`/api/subtasks/${newId()}`, { taskId, title: "แฮก", position: "a0" });

    expect(response.status).toBe(404);
  });

  it("answers 404 for a subtask id owned by another user", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const subtask = await createSubtask(owner, await createTask(owner));
    const intruderTaskId = await createTask(intruder);

    const response = await apiAs(intruder).put(`/api/subtasks/${subtask.id}`, {
      taskId: intruderTaskId,
      title: "แฮก",
      position: "a0",
    });

    expect(response.status).toBe(404);
  });

  it("answers 404 for a deleted task", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);
    await apiAs(userId).delete(`/api/tasks/${taskId}`);

    const response = await apiAs(userId).put(`/api/subtasks/${newId()}`, { taskId, title: "ซื้อน้ำยา", position: "a0" });

    expect(response.status).toBe(404);
  });

  it("refuses the 51st subtask of a task with 409 SUBTASK_LIMIT", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);
    await seedSubtasks(userId, taskId, 50);

    const response = await apiAs(userId).put(`/api/subtasks/${newId()}`, { taskId, title: "เกิน", position: "a0" });

    expect(response.status).toBe(409);
    expect((await bodyOf<ApiError>(response)).error.code).toBe("SUBTASK_LIMIT");
  });
});

describe("PATCH /api/subtasks/:id", () => {
  it("ticks, unticks and renames a subtask", async () => {
    const userId = await createTestUser();
    const subtask = await createSubtask(userId, await createTask(userId));

    const ticked = await bodyOf<Subtask>(await apiAs(userId).patch(`/api/subtasks/${subtask.id}`, { completed: true }));
    expect(ticked.completedAt).toEqual(expect.any(Number));

    const renamed = await bodyOf<Subtask>(
      await apiAs(userId).patch(`/api/subtasks/${subtask.id}`, { completed: false, title: "ซื้อท่อ" }),
    );
    expect(renamed).toMatchObject({ completedAt: null, title: "ซื้อท่อ" });
  });

  it("answers 404 for another user's subtask", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const subtask = await createSubtask(owner, await createTask(owner));

    expect((await apiAs(intruder).patch(`/api/subtasks/${subtask.id}`, { title: "แฮก" })).status).toBe(404);
  });
});

describe("DELETE /api/subtasks/:id and restore", () => {
  it("soft-deletes and restores a subtask", async () => {
    const userId = await createTestUser();
    const subtask = await createSubtask(userId, await createTask(userId));

    const deleted = await bodyOf<Subtask>(await apiAs(userId).delete(`/api/subtasks/${subtask.id}`));
    expect(deleted.deletedAt).toEqual(expect.any(Number));

    const restored = await bodyOf<Subtask>(await apiAs(userId).post(`/api/subtasks/${subtask.id}/restore`));
    expect(restored.deletedAt).toBeNull();
  });

  it("refuses to restore past 50 subtasks", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);
    const subtask = await createSubtask(userId, taskId);
    await apiAs(userId).delete(`/api/subtasks/${subtask.id}`);
    await seedSubtasks(userId, taskId, 50);

    const response = await apiAs(userId).post(`/api/subtasks/${subtask.id}/restore`);

    expect((await bodyOf<ApiError>(response)).error.code).toBe("SUBTASK_LIMIT");
  });

  it("does not let another user delete or restore a subtask", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const subtask = await createSubtask(owner, await createTask(owner));

    expect((await apiAs(intruder).delete(`/api/subtasks/${subtask.id}`)).status).toBe(404);
    await apiAs(owner).delete(`/api/subtasks/${subtask.id}`);
    expect((await apiAs(intruder).post(`/api/subtasks/${subtask.id}/restore`)).status).toBe(404);
  });
});
