import { and, eq, inArray, lt, notExists, or } from "drizzle-orm";
import { todayInTimeZone } from "../../shared/time-zone";
import type { Db } from "../db/client";
import { attachments, cronRuns, projects, subtasks, tasks } from "../db/schema";

/** Soft-deleted rows stay this long, so Undo and restore keep working (ARCHITECTURE section 4). */
const KEEP_DELETED_MS = 7 * 24 * 60 * 60 * 1000;
const PURGE_HOUR_UTC = 3;
/** R2 deletes at most 1,000 keys per call. */
const R2_DELETE_LIMIT = 1000;

/**
 * Claims today's purge: true for the first run at or after 03:00 UTC, false
 * for every other run that day. One conditional upsert, so two overlapping
 * runs cannot both win.
 */
async function claimTodaysPurge(db: Db, now: number) {
  if (new Date(now).getUTCHours() < PURGE_HOUR_UTC) return false;
  const today = todayInTimeZone(now, "UTC");
  const claimed = await db
    .insert(cronRuns)
    .values({ job: "purge", lastRunOn: today })
    .onConflictDoUpdate({
      target: cronRuns.job,
      set: { lastRunOn: today },
      setWhere: lt(cronRuns.lastRunOn, today),
    })
    .returning({ job: cronRuns.job });
  return claimed.length > 0;
}

async function deleteFiles(files: R2Bucket, keys: string[]) {
  for (let start = 0; start < keys.length; start += R2_DELETE_LIMIT) {
    await files.delete(keys.slice(start, start + R2_DELETE_LIMIT));
  }
}

/**
 * Once a day, hard-deletes rows soft-deleted more than 7 days ago: tasks with
 * all their subtasks and attachments, subtasks and attachments deleted on
 * their own, and projects with no tasks left. The R2 objects go first: if the
 * rows delete then fails, tomorrow's purge finds them again.
 */
export async function purgeDeletedRows(db: Db, files: R2Bucket, now: number) {
  if (!(await claimTodaysPurge(db, now))) return null;
  const cutoff = now - KEEP_DELETED_MS;

  const oldTaskIds = db.select({ id: tasks.id }).from(tasks).where(lt(tasks.deletedAt, cutoff));
  const oldAttachments = or(lt(attachments.deletedAt, cutoff), inArray(attachments.taskId, oldTaskIds));
  const oldSubtasks = or(lt(subtasks.deletedAt, cutoff), inArray(subtasks.taskId, oldTaskIds));
  const taskOfProject = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, projects.id));

  const oldFiles = await db.select({ key: attachments.r2Key }).from(attachments).where(oldAttachments);
  await deleteFiles(files, oldFiles.map((file) => file.key));

  // Children first, in one D1 batch (one transaction).
  const [attachmentRows, subtaskRows, taskRows, projectRows] = await db.batch([
    db.delete(attachments).where(oldAttachments).returning({ id: attachments.id }),
    db.delete(subtasks).where(oldSubtasks).returning({ id: subtasks.id }),
    db.delete(tasks).where(inArray(tasks.id, oldTaskIds)).returning({ id: tasks.id }),
    db
      .delete(projects)
      .where(and(lt(projects.deletedAt, cutoff), notExists(taskOfProject)))
      .returning({ id: projects.id }),
  ]);
  return {
    attachments: attachmentRows.length,
    subtasks: subtaskRows.length,
    tasks: taskRows.length,
    projects: projectRows.length,
  };
}
