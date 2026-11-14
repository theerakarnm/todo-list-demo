import { inArray, lt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { attachments, tasks } from "../db/schema";

/** R2 deletes at most 1,000 keys per call. */
const R2_DELETE_BATCH = 1000;

/**
 * Hard-deletes the images deleted before `cutoffMs`, or whose task was, and
 * their R2 files, 1,000 at a time. Returns how many it removed.
 *
 * Lane 4's daily purge cron calls this (it is not wired into cron.ts here).
 * It must run BEFORE that cron hard-deletes old tasks: the foreign key cascade
 * would drop these rows with their tasks and lose the R2 keys.
 * Files go first, so a failure leaves rows that the next run tries again.
 */
export async function purgeDeletedAttachments(db: D1Database, files: R2Bucket, cutoffMs: number) {
  const orm = drizzle(db);
  const purgeable = or(
    lt(attachments.deletedAt, cutoffMs),
    inArray(attachments.taskId, orm.select({ id: tasks.id }).from(tasks).where(lt(tasks.deletedAt, cutoffMs))),
  );

  let purged = 0;
  for (;;) {
    const batch = await orm
      .select({ id: attachments.id, r2Key: attachments.r2Key })
      .from(attachments)
      .where(purgeable)
      .limit(R2_DELETE_BATCH);
    if (batch.length === 0) return purged;

    await files.delete(batch.map((attachment) => attachment.r2Key));
    const ids = JSON.stringify(batch.map((attachment) => attachment.id));
    await orm.delete(attachments).where(inArray(attachments.id, sql`(SELECT value FROM json_each(${ids}))`));
    purged += batch.length;
  }
}
