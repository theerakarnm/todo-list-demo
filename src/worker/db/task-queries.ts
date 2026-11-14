import { and, eq, isNotNull, isNull, max, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { zonedDateTimeToUtcMs } from "../../shared/time-zone";
import { ApiError } from "../errors";
import type { Db } from "./client";
import { attachmentColumns, subtaskColumns, taskColumns } from "./columns";
import { inJsonList } from "./in-list";
import { getViewSettings } from "./settings-queries";
import { attachments, subtasks, tasks } from "./schema";

/** The user's task with this id, deleted or not. 404 when it is missing or someone else's. */
export async function findOwnTask(db: Db, userId: string, id: string) {
  const task = await db
    .select(taskColumns)
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .get();
  if (!task) throw new ApiError("NOT_FOUND");
  return task;
}

/** Subtasks and attachments live under a task that is the user's and not deleted. Otherwise 404. */
export async function assertUsableTask(db: Db, userId: string, taskId: string) {
  const task = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
    .get();
  if (!task) throw new ApiError("NOT_FOUND");
}

/** The live subtasks of these tasks of the user's (any number of ids: they travel as one JSON parameter). */
export function subtasksOfTasks(db: Db, userId: string, taskIds: string[]) {
  return db
    .select(subtaskColumns)
    .from(subtasks)
    .where(
      and(
        eq(subtasks.userId, userId),
        isNull(subtasks.deletedAt),
        inJsonList(subtasks.taskId, taskIds),
      ),
    );
}

/** The live image metadata of these tasks of the user's (any number of ids, like subtasksOfTasks). */
export function attachmentsOfTasks(db: Db, userId: string, taskIds: string[]) {
  return db
    .select(attachmentColumns)
    .from(attachments)
    .where(
      and(
        eq(attachments.userId, userId),
        isNull(attachments.deletedAt),
        inJsonList(attachments.taskId, taskIds),
      ),
    );
}

/** A position after every task in the project (or the Inbox when projectId is null). */
export async function positionAtEndOfList(db: Db, userId: string, projectId: string | null) {
  const [row] = await db
    .select({ last: max(tasks.position) })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        projectId ? eq(tasks.projectId, projectId) : isNull(tasks.projectId),
        isNull(tasks.deletedAt),
      ),
    );
  return generateKeyBetween(row?.last ?? null, null);
}

type Due = { dueDate: string | null; dueTime: string | null };

/**
 * The reminder columns for a due date and time: remind_at is that moment in
 * the user's time zone (none without a time), and reminder_sent_at is cleared
 * so the new time gets its own reminder.
 */
export async function reminderFor(db: Db, userId: string, { dueDate, dueTime }: Due) {
  if (!dueDate || !dueTime) return { remindAt: null, reminderSentAt: null };
  const { timezone } = await getViewSettings(db, userId);
  return { remindAt: zonedDateTimeToUtcMs(dueDate, dueTime, timezone), reminderSentAt: null };
}

export function isSameDue(a: Due, b: Due) {
  return a.dueDate === b.dueDate && a.dueTime === b.dueTime;
}

type DueDateChange = { id: string; dueDate: string; dueTime: string | null };

/**
 * Gives many tasks a new due date in one statement (any number of rows fits:
 * the changes travel as one JSON parameter). Reminders move with the dates.
 */
export async function setDueDates(db: Db, userId: string, timeZone: string, changes: DueDateChange[]) {
  if (changes.length === 0) return;
  const rows = changes.map(({ id, dueDate, dueTime }) => ({
    id,
    dueDate,
    remindAt: dueTime ? zonedDateTimeToUtcMs(dueDate, dueTime, timeZone) : null,
  }));
  await db.run(sql`
    UPDATE tasks
    SET due_date = changes.due_date, remind_at = changes.remind_at, reminder_sent_at = NULL, updated_at = ${Date.now()}
    FROM (
      SELECT value ->> 'id' AS id, value ->> 'dueDate' AS due_date, value ->> 'remindAt' AS remind_at
      FROM json_each(${JSON.stringify(rows)})
    ) AS changes
    WHERE tasks.id = changes.id AND tasks.user_id = ${userId}`);
}

/**
 * After the user's time zone changes, every task with a due time gets the
 * remind_at of its due date and time in the new zone. Completed and deleted
 * tasks move too: un-complete and restore keep remind_at, so a task that comes
 * back must already have the new zone's time. A reminder already sent is armed
 * again when its new time is still ahead of `now`; one whose new time has
 * passed stays sent.
 */
export async function moveRemindersToTimeZone(db: Db, userId: string, timeZone: string, now: number) {
  const timed = await db
    .select({ id: tasks.id, dueDate: tasks.dueDate, dueTime: tasks.dueTime })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNotNull(tasks.dueTime)));
  const rows = timed.flatMap(({ id, dueDate, dueTime }) =>
    dueDate && dueTime ? [{ id, remindAt: zonedDateTimeToUtcMs(dueDate, dueTime, timeZone) }] : [],
  );
  if (rows.length === 0) return;
  await db.run(sql`
    UPDATE tasks
    SET remind_at = changes.remind_at,
      reminder_sent_at = CASE WHEN changes.remind_at > ${now} THEN NULL ELSE tasks.reminder_sent_at END
    FROM (
      SELECT value ->> 'id' AS id, value ->> 'remindAt' AS remind_at
      FROM json_each(${JSON.stringify(rows)})
    ) AS changes
    WHERE tasks.id = changes.id AND tasks.user_id = ${userId}`);
}
