import { and, eq, inArray, lt, notExists, or } from "drizzle-orm";
import { todayInTimeZone } from "../../shared/time-zone";
import type { Db } from "../db/client";
import { inJsonList } from "../db/in-list";
import { attachments, cronRuns, projects, subtasks, tasks } from "../db/schema";

/** Soft-deleted rows stay this long, so Undo and restore keep working (ARCHITECTURE section 4). */
const KEEP_DELETED_MS = 7 * 24 * 60 * 60 * 1000;
const PURGE_HOUR_UTC = 3;
/** R2 deletes at most 1,000 keys per call. */
const R2_DELETE_LIMIT = 1000;

/**
 * Claims today's purge: true for the first run at or after 03:00 UTC, false
 * for every other run that day (unless a run with work left released it).
 * One conditional upsert, so two overlapping runs cannot both win.
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

/** Lets the next run claim today's purge again, to go on where this one stopped. */
async function releaseTodaysPurge(db: Db) {
  await db.delete(cronRuns).where(eq(cronRuns.job, "purge"));
}

type Limits = {
  /** Rows per statement, and keys per R2 delete call (R2 takes at most 1,000). */
  pageSize: number;
  /** Pages one run may delete; the rest waits for the next run. */
  pagesPerRun: number;
};

/**
 * 10 pages keep one run to about 20 D1 queries, well inside the Workers Free
 * limit of 50 per invocation that the reminder and digest jobs share.
 */
const DEFAULT_LIMITS: Limits = { pageSize: R2_DELETE_LIMIT, pagesPerRun: 10 };

type Counts = { attachments: number; subtasks: number; tasks: number; projects: number };

/** One kind of old row: deletes up to `limit` of them and says how many went. */
type PurgePage = (limit: number) => Promise<number>;

function purgePages(db: Db, files: R2Bucket, cutoff: number): [keyof Counts, PurgePage][] {
  const oldTaskIds = db.select({ id: tasks.id }).from(tasks).where(lt(tasks.deletedAt, cutoff));
  const oldAttachments = or(lt(attachments.deletedAt, cutoff), inArray(attachments.taskId, oldTaskIds));
  const oldSubtasks = or(lt(subtasks.deletedAt, cutoff), inArray(subtasks.taskId, oldTaskIds));
  const attachmentOfTask = db.select({ id: attachments.id }).from(attachments).where(eq(attachments.taskId, tasks.id));
  const taskOfProject = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, projects.id));

  return [
    [
      "attachments",
      async (limit) => {
        const page = await db
          .select({ id: attachments.id, key: attachments.r2Key })
          .from(attachments)
          .where(oldAttachments)
          .limit(limit);
        if (page.length === 0) return 0;
        // The R2 objects first: if the rows delete then fails, the next purge finds them again.
        await files.delete(page.map((file) => file.key));
        await db.delete(attachments).where(inJsonList(attachments.id, page.map((file) => file.id)));
        return page.length;
      },
    ],
    [
      "subtasks",
      async (limit) => {
        const page = db.select({ id: subtasks.id }).from(subtasks).where(oldSubtasks).limit(limit);
        const deleted = await db.delete(subtasks).where(inArray(subtasks.id, page)).returning({ id: subtasks.id });
        return deleted.length;
      },
    ],
    [
      "tasks",
      async (limit) => {
        // Deleting a task cascades to its attachment rows, so a task goes only
        // once its attachments (and their R2 objects) are gone.
        const page = db
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(lt(tasks.deletedAt, cutoff), notExists(attachmentOfTask)))
          .limit(limit);
        const deleted = await db.delete(tasks).where(inArray(tasks.id, page)).returning({ id: tasks.id });
        return deleted.length;
      },
    ],
    [
      "projects",
      async (limit) => {
        // Deleting a project cascades to its tasks, so it waits until none of them remain.
        const page = db
          .select({ id: projects.id })
          .from(projects)
          .where(and(lt(projects.deletedAt, cutoff), notExists(taskOfProject)))
          .limit(limit);
        const deleted = await db.delete(projects).where(inArray(projects.id, page)).returning({ id: projects.id });
        return deleted.length;
      },
    ],
  ];
}

/**
 * Once a day, hard-deletes rows soft-deleted more than 7 days ago: attachments
 * with their R2 objects, subtasks, tasks, then projects with no tasks left,
 * one bounded page at a time. A run that uses up its pages hands the rest to
 * the next minute's run, so a large backlog never makes one run too long.
 */
export async function purgeDeletedRows(db: Db, files: R2Bucket, now: number, limits = DEFAULT_LIMITS) {
  if (!(await claimTodaysPurge(db, now))) return null;
  const counts: Counts = { attachments: 0, subtasks: 0, tasks: 0, projects: 0 };
  let pages = 0;
  for (const [kind, purgePage] of purgePages(db, files, now - KEEP_DELETED_MS)) {
    let deleted: number;
    do {
      if (pages === limits.pagesPerRun) {
        await releaseTodaysPurge(db);
        return counts;
      }
      deleted = await purgePage(limits.pageSize);
      counts[kind] += deleted;
      pages++;
    } while (deleted === limits.pageSize);
  }
  return counts;
}
