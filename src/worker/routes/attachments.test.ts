import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "../../shared/constants";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { attachmentForm, createTask, pngFile, renamedExeFile, seedAttachments } from "../test/images";
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

  it("refuses an 11th image on a task with 409 ATTACHMENT_LIMIT, not counting deleted ones", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);
    await seedAttachments(userId, taskId, 3, { deletedAt: Date.now() });
    await seedAttachments(userId, taskId, LIMITS.attachmentsPerTask - 1);
    await uploadPng(userId, taskId);

    const response = await upload(userId, taskId, attachmentForm(pngFile()));

    expect(response.status).toBe(409);
    const body = await bodyOf<ApiError>(response);
    expect(body.error.code).toBe("ATTACHMENT_LIMIT");
    expect(body.error.message).toContain("10");
  });

  it("refuses an image that would take the account over 200 MB with 409 STORAGE_LIMIT", async () => {
    const userId = await createTestUser();
    const firstTaskId = await createTask(userId);
    const secondTaskId = await createTask(userId);
    await seedAttachments(userId, firstTaskId, 1, { bytes: LIMITS.storageBytesPerUser / 2 });
    await seedAttachments(userId, secondTaskId, 1, { bytes: LIMITS.storageBytesPerUser / 2 - 100 });
    await seedAttachments(userId, secondTaskId, 1, { bytes: LIMITS.storageBytesPerUser, deletedAt: Date.now() });
    await uploadPng(userId, firstTaskId);

    const response = await upload(userId, firstTaskId, attachmentForm(pngFile(64)));

    expect(response.status).toBe(409);
    const body = await bodyOf<ApiError>(response);
    expect(body.error.code).toBe("STORAGE_LIMIT");
    expect(body.error.message).toContain("200 MB");
  });

  it("does not count another user's images against the storage limit", async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    await seedAttachments(otherUserId, await createTask(otherUserId), 1, { bytes: LIMITS.storageBytesPerUser });

    await uploadPng(userId, await createTask(userId));
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

describe("DELETE /api/attachments/:id", () => {
  it("soft-deletes the row and removes the R2 object right away", async () => {
    const userId = await createTestUser();
    const attachment = await uploadPng(userId, await createTask(userId));

    const response = await apiAs(userId).delete(`/api/attachments/${attachment.id}`);

    expect(response.status).toBe(200);
    const deleted = await bodyOf<Attachment>(response);
    expect(deleted.deletedAt).toEqual(expect.any(Number));
    expect(deleted.updatedAt).toBe(deleted.deletedAt);
    expect(await env.FILES.head(attachment.r2Key)).toBeNull();
  });

  it("is idempotent: deleting again answers the same deleted row", async () => {
    const userId = await createTestUser();
    const attachment = await uploadPng(userId, await createTask(userId));
    const first = await bodyOf<Attachment>(await apiAs(userId).delete(`/api/attachments/${attachment.id}`));

    const again = await apiAs(userId).delete(`/api/attachments/${attachment.id}`);

    expect(again.status).toBe(200);
    expect(await bodyOf<Attachment>(again)).toEqual(first);
  });

  it("answers 404 for another user's attachment and leaves its file alone", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const attachment = await uploadPng(owner, await createTask(owner));

    const response = await apiAs(intruder).delete(`/api/attachments/${attachment.id}`);

    expect(response.status).toBe(404);
    expect(await env.FILES.head(attachment.r2Key)).not.toBeNull();
    const row = await env.DB.prepare("SELECT deleted_at FROM attachments WHERE id = ?").bind(attachment.id).first();
    expect(row?.deleted_at).toBeNull();
  });
});
