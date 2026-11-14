import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { attachmentForm, createTask, pngFile, seedAttachments } from "../test/images";
import { createTestUser } from "../test/users";
import { purgeDeletedAttachments } from "./purge-attachment-files";

const CUTOFF = Date.UTC(2026, 10, 7);
const BEFORE = CUTOFF - 1;
const AFTER = CUTOFF + 1;
const DAY_MS = 24 * 60 * 60 * 1000;

async function insertTask(userId: string, deletedAt: number | null) {
  const id = newId();
  await env.DB.prepare(
    "INSERT INTO tasks (id, user_id, title, position, created_at, updated_at, deleted_at) VALUES (?, ?, 'งาน', 'a0', 1, 1, ?)",
  )
    .bind(id, userId, deletedAt)
    .run();
  return id;
}

/** One attachment row with its R2 object; returns the key. */
async function insertAttachment(userId: string, taskId: string, deletedAt: number | null) {
  const id = newId();
  const key = `u/${userId}/t/${taskId}/${id}`;
  await env.DB.prepare(
    "INSERT INTO attachments (id, task_id, user_id, r2_key, mime, bytes, position, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, 'image/webp', 3, 'a0', 1, 1, ?)",
  )
    .bind(id, taskId, userId, key, deletedAt)
    .run();
  await env.FILES.put(key, "img");
  return key;
}

async function remainingKeys(userId: string) {
  const { results } = await env.DB.prepare("SELECT r2_key FROM attachments WHERE user_id = ?").bind(userId).all<{ r2_key: string }>();
  const objects = await env.FILES.list({ prefix: `u/${userId}/` });
  return { rows: results.map((row) => row.r2_key).sort(), files: objects.objects.map((object) => object.key).sort() };
}

describe("purgeDeletedAttachments", () => {
  it("removes the rows and files of images deleted before the cutoff, or whose task was", async () => {
    const userId = await createTestUser();
    const liveTaskId = await insertTask(userId, null);
    const oldTaskId = await insertTask(userId, BEFORE);
    const recentTaskId = await insertTask(userId, AFTER);
    const live = await insertAttachment(userId, liveTaskId, null);
    await insertAttachment(userId, liveTaskId, BEFORE);
    const recentlyDeleted = await insertAttachment(userId, liveTaskId, AFTER);
    await insertAttachment(userId, oldTaskId, BEFORE);
    const onRecentTask = await insertAttachment(userId, recentTaskId, AFTER);

    const purged = await purgeDeletedAttachments(env.DB, env.FILES, CUTOFF);

    expect(purged).toBe(2);
    const kept = [live, recentlyDeleted, onRecentTask].sort();
    expect(await remainingKeys(userId)).toEqual({ rows: kept, files: kept });
  });

  it("removes the file an image delete left in R2 once 7 days have passed, and keeps a recent delete for Undo", async () => {
    const userId = await createTestUser();
    const taskId = await createTask(userId);
    const upload = () => apiAs(userId).postForm(`/api/tasks/${taskId}/attachments`, attachmentForm(pngFile()));
    const old = await bodyOf<{ id: string; r2Key: string }>(await upload());
    const recent = await bodyOf<{ id: string; r2Key: string }>(await upload());
    await apiAs(userId).delete(`/api/attachments/${old.id}`);
    await apiAs(userId).delete(`/api/attachments/${recent.id}`);
    const now = Date.UTC(2026, 10, 14);
    const setDeletedAt = (id: string, deletedAt: number) =>
      env.DB.prepare("UPDATE attachments SET deleted_at = ? WHERE id = ?").bind(deletedAt, id).run();
    await setDeletedAt(old.id, now - 8 * DAY_MS);
    await setDeletedAt(recent.id, now - DAY_MS);

    expect(await purgeDeletedAttachments(env.DB, env.FILES, now - 7 * DAY_MS)).toBe(1);

    expect(await remainingKeys(userId)).toEqual({ rows: [recent.r2Key], files: [recent.r2Key] });
  });

  it("removes more images than one R2 delete call takes", async () => {
    const userId = await createTestUser();
    const taskId = await insertTask(userId, BEFORE);
    await seedAttachments(userId, taskId, 1005, { deletedAt: BEFORE });
    const { results } = await env.DB.prepare("SELECT r2_key FROM attachments WHERE task_id = ?").bind(taskId).all<{ r2_key: string }>();
    await Promise.all(results.map((row) => env.FILES.put(row.r2_key, "img")));

    expect(await purgeDeletedAttachments(env.DB, env.FILES, CUTOFF)).toBe(1005);

    expect(await remainingKeys(userId)).toEqual({ rows: [], files: [] });
  });
});
