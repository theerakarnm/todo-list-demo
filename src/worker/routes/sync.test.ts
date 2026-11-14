import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { attachmentForm, pngFile } from "../test/images";
import { createTestUser } from "../test/users";

type Row = { id: string; deletedAt: number | null; completedAt?: number | null; taskId?: string };
type Sync = {
  tasks: Row[];
  projects: Row[];
  subtasks: Row[];
  attachments: Row[];
  settings: { timezone: string; weekStart: string };
  cursor: number;
};

const idsOf = (rows: Row[]) => rows.map((row) => row.id).sort();

async function put(userId: string, kind: "tasks" | "projects" | "subtasks", body: Record<string, unknown>) {
  const id = newId();
  const response = await apiAs(userId).put(`/api/${kind}/${id}`, { position: "a0", ...body });
  expect(response.status).toBe(200);
  return id;
}

/** Makes everything the user has look old, so a delta only shows what changes next. */
async function ageAllRows(userId: string) {
  for (const table of ["tasks", "projects", "subtasks", "attachments"]) {
    await env.DB.prepare(`UPDATE ${table} SET updated_at = 1000 WHERE user_id = ?`).bind(userId).run();
  }
}

async function attach(userId: string, taskId: string) {
  const response = await apiAs(userId).postForm(`/api/tasks/${taskId}/attachments`, attachmentForm(pngFile()));
  expect(response.status).toBe(201);
  return (await bodyOf<Row>(response)).id;
}

async function sync(userId: string, since?: number) {
  const response = await apiAs(userId).get(since === undefined ? "/api/sync" : `/api/sync?since=${since}`);
  expect(response.status).toBe(200);
  return bodyOf<Sync>(response);
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("GET /api/sync without since (full load)", () => {
  it("returns active tasks, live projects, their subtasks and the view settings", async () => {
    const userId = await createTestUser({ timezone: "Asia/Bangkok" });
    const projectId = await put(userId, "projects", { name: "งาน" });
    const deletedProjectId = await put(userId, "projects", { name: "เลิกแล้ว" });
    const activeId = await put(userId, "tasks", { title: "ทำอยู่", projectId });
    const completedId = await put(userId, "tasks", { title: "เสร็จแล้ว" });
    const deletedId = await put(userId, "tasks", { title: "ลบแล้ว" });
    const subtaskId = await put(userId, "subtasks", { taskId: activeId, title: "ขั้นแรก" });
    const deletedSubtaskId = await put(userId, "subtasks", { taskId: activeId, title: "ขั้นลบ" });
    const completedTaskSubtaskId = await put(userId, "subtasks", { taskId: completedId, title: "ขั้นเก่า" });
    await apiAs(userId).patch(`/api/tasks/${completedId}`, { completed: true });
    await apiAs(userId).delete(`/api/tasks/${deletedId}`);
    await apiAs(userId).delete(`/api/subtasks/${deletedSubtaskId}`);
    await apiAs(userId).delete(`/api/projects/${deletedProjectId}`);

    const body = await sync(userId);

    expect(idsOf(body.tasks)).toEqual([activeId]);
    expect(idsOf(body.projects)).toEqual([projectId]);
    expect(idsOf(body.subtasks)).toEqual([subtaskId]);
    expect(idsOf(body.subtasks)).not.toContain(completedTaskSubtaskId);
    expect(body.settings).toEqual({ timezone: "Asia/Bangkok", weekStart: "mon" });
  });

  it("never returns another user's rows", async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    await put(otherUserId, "tasks", { title: "ของคนอื่น" });
    await put(otherUserId, "projects", { name: "ของคนอื่น" });

    const body = await sync(userId);

    expect(body.tasks).toEqual([]);
    expect(body.projects).toEqual([]);
    expect(body.subtasks).toEqual([]);
    expect(body.attachments).toEqual([]);
  });

  it("returns the image metadata of active tasks, without deleted images or completed tasks", async () => {
    const userId = await createTestUser();
    const activeId = await put(userId, "tasks", { title: "ทำอยู่" });
    const completedId = await put(userId, "tasks", { title: "เสร็จแล้ว" });
    const attachmentId = await attach(userId, activeId);
    const deletedAttachmentId = await attach(userId, activeId);
    await attach(userId, completedId);
    await apiAs(userId).patch(`/api/tasks/${completedId}`, { completed: true });
    await apiAs(userId).delete(`/api/attachments/${deletedAttachmentId}`);

    const body = await sync(userId);

    expect(body.attachments).toEqual([
      {
        id: attachmentId,
        taskId: activeId,
        r2Key: `u/${userId}/t/${activeId}/${attachmentId}`,
        mime: "image/png",
        bytes: 64,
        width: null,
        height: null,
        position: expect.any(String),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        deletedAt: null,
      },
    ]);
  });
});

describe("GET /api/sync?since", () => {
  it("returns only what changed since, including tombstones and completed tasks", async () => {
    const userId = await createTestUser();
    const projectId = await put(userId, "projects", { name: "งาน" });
    const unchangedId = await put(userId, "tasks", { title: "ไม่แตะ" });
    const renamedId = await put(userId, "tasks", { title: "ชื่อเดิม" });
    const completedId = await put(userId, "tasks", { title: "จะเสร็จ" });
    const deletedId = await put(userId, "tasks", { title: "จะลบ" });
    const subtaskId = await put(userId, "subtasks", { taskId: unchangedId, title: "จะลบ" });
    await ageAllRows(userId);

    await apiAs(userId).patch(`/api/tasks/${renamedId}`, { title: "ชื่อใหม่" });
    await apiAs(userId).patch(`/api/tasks/${completedId}`, { completed: true });
    await apiAs(userId).delete(`/api/tasks/${deletedId}`);
    await apiAs(userId).delete(`/api/subtasks/${subtaskId}`);
    await apiAs(userId).delete(`/api/projects/${projectId}`);
    const body = await sync(userId, 5000);

    expect(idsOf(body.tasks)).toEqual([completedId, deletedId, renamedId].sort());
    expect(body.tasks.find((task) => task.id === deletedId)?.deletedAt).toEqual(expect.any(Number));
    expect(body.tasks.find((task) => task.id === completedId)?.completedAt).toEqual(expect.any(Number));
    expect(body.projects).toEqual([expect.objectContaining({ id: projectId, deletedAt: expect.any(Number) })]);
    expect(body.subtasks).toEqual([expect.objectContaining({ id: subtaskId, deletedAt: expect.any(Number) })]);
  });

  it("sends the subtasks of a task that changed, so an un-completed task arrives whole", async () => {
    const userId = await createTestUser();
    const taskId = await put(userId, "tasks", { title: "เคยเสร็จ" });
    const subtaskId = await put(userId, "subtasks", { taskId, title: "ขั้นแรก" });
    await apiAs(userId).patch(`/api/tasks/${taskId}`, { completed: true });
    await ageAllRows(userId);

    await apiAs(userId).patch(`/api/tasks/${taskId}`, { completed: false });
    const body = await sync(userId, 5000);

    expect(idsOf(body.subtasks)).toEqual([subtaskId]);
  });

  it("returns changed images, deleted ones as tombstones, and every image of a changed task", async () => {
    const userId = await createTestUser();
    const quietTaskId = await put(userId, "tasks", { title: "ไม่แตะ" });
    const reopenedTaskId = await put(userId, "tasks", { title: "เคยเสร็จ" });
    const untouchedId = await attach(userId, quietTaskId);
    const movedId = await attach(userId, quietTaskId);
    const deletedId = await attach(userId, quietTaskId);
    const reopenedTaskImageId = await attach(userId, reopenedTaskId);
    await apiAs(userId).patch(`/api/tasks/${reopenedTaskId}`, { completed: true });
    await ageAllRows(userId);

    await apiAs(userId).patch(`/api/attachments/${movedId}`, { position: "Zz" });
    await apiAs(userId).delete(`/api/attachments/${deletedId}`);
    await apiAs(userId).patch(`/api/tasks/${reopenedTaskId}`, { completed: false });
    const body = await sync(userId, 5000);

    expect(idsOf(body.attachments)).toEqual([deletedId, movedId, reopenedTaskImageId].sort());
    expect(idsOf(body.attachments)).not.toContain(untouchedId);
    expect(body.attachments.find((row) => row.id === deletedId)?.deletedAt).toEqual(expect.any(Number));
  });

  it("sends an image deleted and then restored as live again", async () => {
    const userId = await createTestUser();
    const taskId = await put(userId, "tasks", { title: "ใบเสร็จ" });
    const imageId = await attach(userId, taskId);
    await ageAllRows(userId);

    await apiAs(userId).delete(`/api/attachments/${imageId}`);
    const afterDelete = await sync(userId, 5000);
    await apiAs(userId).post(`/api/attachments/${imageId}/restore`);
    const afterRestore = await sync(userId, 5000);

    expect(afterDelete.attachments).toEqual([expect.objectContaining({ id: imageId, deletedAt: expect.any(Number) })]);
    expect(afterRestore.attachments).toEqual([expect.objectContaining({ id: imageId, deletedAt: null })]);
  });

  it("overlaps the cursor, so a write that lands just before it is never lost", async () => {
    const userId = await createTestUser();
    const first = await sync(userId);
    const taskId = await put(userId, "tasks", { title: "เพิ่งเพิ่ม" });

    const second = await sync(userId, first.cursor);

    expect(first.cursor).toBeLessThan(Date.now());
    expect(idsOf(second.tasks)).toEqual([taskId]);
  });

  it("never returns another user's changes", async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    await put(otherUserId, "tasks", { title: "ของคนอื่น" });

    const body = await sync(userId, 0);

    expect(body.tasks).toEqual([]);
  });

  it("rejects a since that is not a number", async () => {
    const userId = await createTestUser();

    expect((await apiAs(userId).get("/api/sync?since=yesterday")).status).toBe(400);
  });
});
