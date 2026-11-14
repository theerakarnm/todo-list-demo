import { and, eq, isNull, max } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { Hono } from "hono";
import { idParamSchema } from "../../shared/schemas/fields";
import { createDb, type Db } from "../db/client";
import { attachmentColumns } from "../db/columns";
import { attachments } from "../db/schema";
import { assertUsableTask } from "../db/task-queries";
import { ApiError } from "../errors";
import { attachmentFileKey } from "../files/file-keys";
import { SNIFF_BYTES, sniffImageMime } from "../files/sniff-image";
import { uploadAttachmentSchema } from "../files/upload-forms";
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

// Mounted inside taskRoutes at /:id/attachments, whose requireSession already checks the session and the rate limit.
export const taskAttachmentRoutes = new Hono<SessionEnv>()

  // Upload with the client's UUIDv7, so a retried upload never stores a second copy.
  .post("/", validate("param", idParamSchema), validate("form", uploadAttachmentSchema), async (c) => {
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

    const mime = sniffImageMime(new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()));
    if (!mime) throw new ApiError("INTERNAL_ERROR");

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
