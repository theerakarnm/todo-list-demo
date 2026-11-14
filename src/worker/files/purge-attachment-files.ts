import { inArray, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { inJsonList } from "../db/in-list";
import { attachments, tasks } from "../db/schema";

type PurgeOptions = {
  /** Images per page; R2 deletes at most 1,000 keys per call. */
  pageSize?: number;
  /** Pages this call may delete; the rest waits for a later call. */
  maxPages?: number;
};

/**
 * Hard-deletes the images deleted before `cutoffMs`, or whose task was, and
 * their R2 files, one page at a time. `done` is false when it stopped at
 * `maxPages` with images possibly left.
 *
 * The purge cron calls this before it hard-deletes old tasks: the foreign key
 * cascade would drop these rows with their tasks and lose the R2 keys.
 * Files go first, so a failure leaves rows that the next run tries again.
 */
export async function purgeDeletedAttachments(
  db: D1Database,
  files: R2Bucket,
  cutoffMs: number,
  { pageSize = 1000, maxPages = Number.POSITIVE_INFINITY }: PurgeOptions = {},
) {
  const orm = drizzle(db);
  const purgeable = or(
    lt(attachments.deletedAt, cutoffMs),
    inArray(attachments.taskId, orm.select({ id: tasks.id }).from(tasks).where(lt(tasks.deletedAt, cutoffMs))),
  );

  let purged = 0;
  let pages = 0;
  while (pages < maxPages) {
    const page = await orm
      .select({ id: attachments.id, r2Key: attachments.r2Key })
      .from(attachments)
      .where(purgeable)
      .limit(pageSize);
    pages++;
    if (page.length > 0) {
      await files.delete(page.map((attachment) => attachment.r2Key));
      await orm.delete(attachments).where(inJsonList(attachments.id, page.map((attachment) => attachment.id)));
      purged += page.length;
    }
    if (page.length < pageSize) return { purged, pages, done: true };
  }
  return { purged, pages, done: false };
}
