import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "../../shared/constants";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { attachmentForm, createTask, pngFile, renamedExeFile } from "../test/images";
import { createTestUser } from "../test/users";

type Attachment = {
  id: string;
  taskId: string;
  r2Key: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  position: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  userId?: string;
};
type ApiError = { error: { code: string; message: string } };

function upload(userId: string, taskId: string, form: FormData) {
  return apiAs(userId).postForm(`/api/tasks/${taskId}/attachments`, form);
}

async function uploadPng(userId: string, taskId: string, fields: Record<string, string> = {}) {
  const response = await upload(userId, taskId, attachmentForm(pngFile(), fields));
  expect(response.status).toBe(201);
  return bodyOf<Attachment>(response);
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/tasks/:id/attachments", () => {
  it("stores the image in R2 under the user's prefix and answers 201 with the row", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);
    const id = newId();
    const before = Date.now();

    const response = await upload(userId, taskId, attachmentForm(pngFile(300), { id, width: "640", height: "480" }));

    expect(response.status).toBe(201);
    const attachment = await bodyOf<Attachment>(response);
    expect(attachment).toMatchObject({
      id,
      taskId,
      r2Key: `u/${userId}/t/${taskId}/${id}`,
      mime: "image/png",
      bytes: 300,
      width: 640,
      height: 480,
      deletedAt: null,
    });
    expect(attachment.createdAt).toBeGreaterThanOrEqual(before);
    expect(attachment.updatedAt).toBe(attachment.createdAt);
    expect(attachment.userId).toBeUndefined();
    const object = await env.FILES.get(attachment.r2Key);
    expect(object?.httpMetadata?.contentType).toBe("image/png");
    expect((await object?.arrayBuffer())?.byteLength).toBe(300);
  });

  it("puts each new image after the last one of the task", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);

    const first = await uploadPng(userId, taskId);
    const second = await uploadPng(userId, taskId);

    expect(second.position > first.position).toBe(true);
  });

  it("is idempotent: the same id again returns the stored row without a second object", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);
    const first = await uploadPng(userId, taskId);

    const response = await upload(userId, taskId, attachmentForm(pngFile(999), { id: first.id }));

    expect(response.status).toBe(200);
    expect(await bodyOf<Attachment>(response)).toEqual(first);
    expect((await env.FILES.head(first.r2Key))?.size).toBe(64);
    const rows = await env.DB.prepare("SELECT count(*) AS n FROM attachments WHERE id = ?").bind(first.id).first("n");
    expect(rows).toBe(1);
  });

  it("answers 404 for another user's task, a deleted task, and another user's attachment id", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const taskId = await createTask(owner);
    const attachment = await uploadPng(owner, taskId);
    const intruderTaskId = await createTask(intruder);

    expect((await upload(intruder, taskId, attachmentForm(pngFile()))).status).toBe(404);
    const reused = await upload(intruder, intruderTaskId, attachmentForm(pngFile(), { id: attachment.id }));
    expect(reused.status).toBe(404);
    await apiAs(owner).delete(`/api/tasks/${taskId}`);
    const deleted = await upload(owner, taskId, attachmentForm(pngFile()));
    expect(deleted.status).toBe(404);
    expect((await bodyOf<ApiError>(deleted)).error.code).toBe("NOT_FOUND");
  });

  it("rejects a program renamed to .jpg with 415 UNSUPPORTED_FILE, storing nothing", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);

    const response = await upload(userId, taskId, attachmentForm(renamedExeFile()));

    expect(response.status).toBe(415);
    expect((await bodyOf<ApiError>(response)).error.code).toBe("UNSUPPORTED_FILE");
    expect((await env.FILES.list({ prefix: `u/${userId}/` })).objects).toEqual([]);
  });

  it("rejects an image over 5 MB with 413 FILE_TOO_LARGE in Thai", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);

    const response = await upload(userId, taskId, attachmentForm(pngFile(LIMITS.attachmentBytes + 1)));

    expect(response.status).toBe(413);
    const body = await bodyOf<ApiError>(response);
    expect(body.error.code).toBe("FILE_TOO_LARGE");
    expect(body.error.message).toContain("5 MB");
    expect((await env.FILES.list({ prefix: `u/${userId}/` })).objects).toEqual([]);
  });

  it("refuses a body far over the limit from its Content-Length, before reading it", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);

    const response = await upload(userId, taskId, attachmentForm(pngFile(LIMITS.attachmentBytes * 2)));

    expect(response.status).toBe(413);
    expect((await bodyOf<ApiError>(response)).error.code).toBe("FILE_TOO_LARGE");
  });

  it("rejects an id that is not a UUIDv7 and a form without a file", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);
    const withoutFile = new FormData();
    withoutFile.set("id", newId());

    expect((await upload(userId, taskId, attachmentForm(pngFile(), { id: crypto.randomUUID() }))).status).toBe(400);
    expect((await upload(userId, taskId, withoutFile)).status).toBe(400);
  });
});
