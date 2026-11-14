import { and, eq, isNull, max } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { Hono } from "hono";
import { updateAttachmentSchema } from "../../shared/schemas/attachment";
import { idParamSchema } from "../../shared/schemas/fields";
import { createDb, type Db } from "../db/client";
import { attachmentColumns } from "../db/columns";
import { attachments } from "../db/schema";
import { assertUsableTask } from "../db/task-queries";
import { ApiError } from "../errors";
import { assertRoomForAttachment, assertRoomInStorage } from "../limits";
import { attachmentFileKey } from "../files/file-keys";
import { assertImageFile, imageBodyLimit, uploadAttachmentSchema } from "../files/uploads";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";
import { validate } from "../validate";

/** A position after every live attachment of the task. */
async function positionAtEndOfGallery(db: Db, taskId: string) {
  const [row] = await db
    .select({ last: max(attachments.position) })
    .from(attachments)
    .where(and(eq(attachments.taskId, taskId), isNull(attachments.deletedAt)));
  return generateKeyBetween(row?.last ?? null, null);
}

/** The attachment with this id, with its owner, so a retried upload can be told apart from someone else's id. */
function findAttachment(db: Db, id: string) {
  return db
    .select({ userId: attachments.userId, attachment: attachmentColumns })
    .from(attachments)
    .where(eq(attachments.id, id))
    .get();
}

async function findOwnAttachment(db: Db, userId: string, id: string) {
  const attachment = await db
    .select(attachmentColumns)
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))
    .get();
  if (!attachment) throw new ApiError("NOT_FOUND");
  return attachment;
}

async function updateAttachment(db: Db, id: string, changes: Partial<typeof attachments.$inferInsert>) {
  return db
    .update(attachments)
    .set({ updatedAt: Date.now(), ...changes })
    .where(eq(attachments.id, id))
    .returning(attachmentColumns)
    .get();
}

// Mounted inside taskRoutes at /:id/attachments, whose requireSession already checks the session and the rate limit.
export const taskAttachmentRoutes = new Hono<SessionEnv>()

  // Upload with the client's UUIDv7, so a retried upload never stores a second copy.
  .post("/", imageBodyLimit, validate("param", idParamSchema), validate("form", uploadAttachmentSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id: taskId } = c.req.valid("param");
    const { id, file, width, height } = c.req.valid("form");
    await assertUsableTask(db, userId, taskId);

    const existing = await findAttachment(db, id);
    if (existing && existing.userId !== userId) throw new ApiError("NOT_FOUND");
    // An attachment cannot move to another task.
    if (existing && existing.attachment.taskId !== taskId) throw new ApiError("VALIDATION_ERROR");
    if (existing) return c.json(existing.attachment, 200);

    const mime = await assertImageFile(file);
    await assertRoomForAttachment(db, taskId);
    await assertRoomInStorage(db, userId, file.size);

    const r2Key = attachmentFileKey(userId, taskId, id);
    await c.env.FILES.put(r2Key, file, { httpMetadata: { contentType: mime } });
    const now = Date.now();
    const created = await db
      .insert(attachments)
      .values({
        id,
        taskId,
        userId,
        r2Key,
        mime,
        bytes: file.size,
        width: width ?? null,
        height: height ?? null,
        position: await positionAtEndOfGallery(db, taskId),
        createdAt: now,
        updatedAt: now,
      })
      .returning(attachmentColumns)
      .get();
    return c.json(created, 201);
  });

export const attachmentRoutes = new Hono<SessionEnv>()
  .use(requireSession)

  // No Undo for an image: the file goes right away. The row stays as a tombstone for sync.
  // If the R2 delete fails, the purge job removes the file of the soft-deleted row later.
  .delete("/:id", validate("param", idParamSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.valid("param");
    const attachment = await findOwnAttachment(db, c.get("userId"), id);
    if (attachment.deletedAt) return c.json(attachment, 200);

    const now = Date.now();
    const deleted = await updateAttachment(db, id, { deletedAt: now, updatedAt: now });
    await c.env.FILES.delete(attachment.r2Key);
    return c.json(deleted, 200);
  })

  // Drag-to-reorder in the gallery: only this row gets a new position.
  .patch("/:id", validate("param", idParamSchema), validate("json", updateAttachmentSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.valid("param");
    const attachment = await findOwnAttachment(db, c.get("userId"), id);
    if (attachment.deletedAt) throw new ApiError("NOT_FOUND");
    return c.json(await updateAttachment(db, id, c.req.valid("json")), 200);
  });
