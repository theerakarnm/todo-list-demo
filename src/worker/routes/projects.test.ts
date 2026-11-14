import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "../../shared/constants";
import type { projects } from "../db/schema";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { attachmentForm, pngFile, seedAttachments } from "../test/images";
import { insertSubtask, seedProjects, seedTasks } from "../test/seed";
import { createTestUser } from "../test/users";

type Project = Omit<typeof projects.$inferSelect, "userId">;
type ApiError = { error: { code: string; message: string } };

async function createProject(userId: string, body: Record<string, unknown> = {}) {
  const id = newId();
  const response = await apiAs(userId).put(`/api/projects/${id}`, { name: "งาน", position: "a0", ...body });
  expect(response.status).toBe(200);
  return bodyOf<Project>(response);
}

async function createTask(userId: string, projectId: string | null) {
  const id = newId();
  const response = await apiAs(userId).put(`/api/tasks/${id}`, { title: "งานในโปรเจกต์", position: "a0", projectId });
  expect(response.status).toBe(200);
  return id;
}

function deletedAtOf(table: "tasks" | "subtasks" | "projects" | "attachments", id: string) {
  return env.DB.prepare(`SELECT deleted_at FROM ${table} WHERE id = ?`).bind(id).first<number | null>("deleted_at");
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("PUT /api/projects/:id", () => {
  it("creates a project, and the same id again updates it", async () => {
    const userId = await createTestUser();
    const created = await createProject(userId, { color: "orange" });
    expect(created).toMatchObject({ name: "งาน", color: "orange", position: "a0", deletedAt: null });

    const response = await apiAs(userId).put(`/api/projects/${created.id}`, { name: "ส่วนตัว", position: "a0" });

    const updated = await bodyOf<Project>(response);
    expect(updated).toMatchObject({ id: created.id, name: "ส่วนตัว", createdAt: created.createdAt });
    const count = await env.DB.prepare("SELECT count(*) AS n FROM projects WHERE id = ?").bind(created.id).first("n");
    expect(count).toBe(1);
  });

  it("answers 404 for a project id owned by another user", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const project = await createProject(owner);

    const response = await apiAs(intruder).put(`/api/projects/${project.id}`, { name: "แฮก", position: "a0" });

    expect(response.status).toBe(404);
  });

  it("refuses the 101st project with 409 PROJECT_LIMIT", async () => {
    const userId = await createTestUser();
    await seedProjects(userId, 100);

    const response = await apiAs(userId).put(`/api/projects/${newId()}`, { name: "เกิน", position: "a0" });

    expect(response.status).toBe(409);
    expect((await bodyOf<ApiError>(response)).error.code).toBe("PROJECT_LIMIT");
  });
});

describe("PATCH /api/projects/:id", () => {
  it("renames or recolours a project", async () => {
    const userId = await createTestUser();
    const project = await createProject(userId);

    const response = await apiAs(userId).patch(`/api/projects/${project.id}`, { color: "violet" });

    expect(await bodyOf<Project>(response)).toMatchObject({ name: "งาน", color: "violet" });
  });

  it("answers 404 for another user's project", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const project = await createProject(owner);

    expect((await apiAs(intruder).patch(`/api/projects/${project.id}`, { name: "แฮก" })).status).toBe(404);
  });
});

describe("DELETE /api/projects/:id and restore", () => {
  it("soft-deletes the project with its tasks and their subtasks, all with one deleted_at", async () => {
    const userId = await createTestUser();
    const project = await createProject(userId);
    const taskId = await createTask(userId, project.id);
    const subtaskId = await insertSubtask(userId, taskId);
    const inboxTaskId = await createTask(userId, null);

    const deleted = await bodyOf<Project>(await apiAs(userId).delete(`/api/projects/${project.id}`));

    expect(deleted.deletedAt).toEqual(expect.any(Number));
    expect(await deletedAtOf("tasks", taskId)).toBe(deleted.deletedAt);
    expect(await deletedAtOf("subtasks", subtaskId)).toBe(deleted.deletedAt);
    expect(await deletedAtOf("tasks", inboxTaskId)).toBeNull();
  });

  it("restores exactly what the delete removed, not tasks deleted before it", async () => {
    const userId = await createTestUser();
    const project = await createProject(userId);
    const taskId = await createTask(userId, project.id);
    const subtaskId = await insertSubtask(userId, taskId);
    const deletedEarlierId = await createTask(userId, project.id);
    await apiAs(userId).delete(`/api/tasks/${deletedEarlierId}`);
    await apiAs(userId).delete(`/api/projects/${project.id}`);

    const restored = await bodyOf<Project>(await apiAs(userId).post(`/api/projects/${project.id}/restore`));

    expect(restored.deletedAt).toBeNull();
    expect(await deletedAtOf("tasks", taskId)).toBeNull();
    expect(await deletedAtOf("subtasks", subtaskId)).toBeNull();
    expect(await deletedAtOf("tasks", deletedEarlierId)).not.toBeNull();
  });

  it("soft-deletes the images of the project's tasks with them, and restore brings back only those", async () => {
    const userId = await createTestUser();
    const project = await createProject(userId);
    const taskId = await createTask(userId, project.id);
    const upload = async () => {
      const response = await apiAs(userId).postForm(`/api/tasks/${taskId}/attachments`, attachmentForm(pngFile()));
      return (await bodyOf<{ id: string }>(response)).id;
    };
    const imageId = await upload();
    const deletedEarlierId = await upload();
    await apiAs(userId).delete(`/api/attachments/${deletedEarlierId}`);
    const earlierDeletedAt = await deletedAtOf("attachments", deletedEarlierId);

    const deleted = await bodyOf<Project>(await apiAs(userId).delete(`/api/projects/${project.id}`));
    expect(await deletedAtOf("attachments", imageId)).toBe(deleted.deletedAt);

    await apiAs(userId).post(`/api/projects/${project.id}/restore`);
    expect(await deletedAtOf("attachments", imageId)).toBeNull();
    expect(await deletedAtOf("attachments", deletedEarlierId)).toBe(earlierDeletedAt);
  });

  it("restores the project and its tasks without their images when they no longer fit in the 200 MB", async () => {
    const userId = await createTestUser();
    const project = await createProject(userId);
    const taskId = await createTask(userId, project.id);
    const response = await apiAs(userId).postForm(`/api/tasks/${taskId}/attachments`, attachmentForm(pngFile()));
    const image = await bodyOf<{ id: string; bytes: number }>(response);
    const deleted = await bodyOf<Project>(await apiAs(userId).delete(`/api/projects/${project.id}`));
    await seedAttachments(userId, await createTask(userId, null), 1, {
      bytes: LIMITS.storageBytesPerUser - image.bytes + 1,
    });

    const restored = await apiAs(userId).post(`/api/projects/${project.id}/restore`);

    expect(restored.status).toBe(200);
    expect(await deletedAtOf("tasks", taskId)).toBeNull();
    expect(await deletedAtOf("attachments", image.id)).toBe(deleted.deletedAt);
  });

  it("refuses the restore when its active tasks would pass 1,000", async () => {
    const userId = await createTestUser();
    const project = await createProject(userId);
    await createTask(userId, project.id);
    await createTask(userId, project.id);
    await apiAs(userId).delete(`/api/projects/${project.id}`);
    await seedTasks(userId, 999);

    const response = await apiAs(userId).post(`/api/projects/${project.id}/restore`);

    expect(response.status).toBe(409);
    expect((await bodyOf<ApiError>(response)).error.code).toBe("TASK_LIMIT");
    expect(await deletedAtOf("projects", project.id)).not.toBeNull();
  });

  it("refuses the restore when the user already has 100 projects", async () => {
    const userId = await createTestUser();
    const project = await createProject(userId);
    await apiAs(userId).delete(`/api/projects/${project.id}`);
    await seedProjects(userId, 100);

    const response = await apiAs(userId).post(`/api/projects/${project.id}/restore`);

    expect((await bodyOf<ApiError>(response)).error.code).toBe("PROJECT_LIMIT");
  });

  it("does not let another user delete or restore a project", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const project = await createProject(owner);

    expect((await apiAs(intruder).delete(`/api/projects/${project.id}`)).status).toBe(404);
    await apiAs(owner).delete(`/api/projects/${project.id}`);
    expect((await apiAs(intruder).post(`/api/projects/${project.id}/restore`)).status).toBe(404);
    expect(await deletedAtOf("projects", project.id)).not.toBeNull();
  });
});
