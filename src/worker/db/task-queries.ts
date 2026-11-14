import { and, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { zonedDateTimeToUtcMs } from "../../shared/time-zone";
import { ApiError } from "../errors";
import type { Db } from "./client";
import { subtaskColumns, taskColumns } from "./columns";
import { getViewSettings } from "./settings-queries";
import { subtasks, tasks } from "./schema";

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

/** The live subtasks of these tasks of the user's (any number of ids: they travel as one JSON parameter). */
export function subtasksOfTasks(db: Db, userId: string, taskIds: string[]) {
  return db
    .select(subtaskColumns)
    .from(subtasks)
    .where(
      and(
        eq(subtasks.userId, userId),
        isNull(subtasks.deletedAt),
        inArray(subtasks.taskId, sql`(SELECT value FROM json_each(${JSON.stringify(taskIds)}))`),
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
