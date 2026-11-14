import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { undoRescheduleSchema } from "../../shared/schemas/task";
import { todayInTimeZone } from "../../shared/time-zone";
import { createDb } from "../db/client";
import { tasks } from "../db/schema";
import { getViewSettings } from "../db/settings-queries";
import { setDueDates } from "../db/task-queries";
import type { SessionEnv } from "../types";
import { validate } from "../validate";

// Mounted inside taskRoutes, whose requireSession already checks the session and the rate limit.
export const rescheduleOverdueRoutes = new Hono<SessionEnv>()

  // Moves every overdue active task to today ("today" in the user's time zone)
  // and returns the previous dates, which the Undo toast sends to /undo.
  .post("/", async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { timezone } = await getViewSettings(db, userId);
    const today = todayInTimeZone(Date.now(), timezone);

    const overdue = await db
      // lt() skips tasks without a date, so dueDate is never null here.
      .select({ id: tasks.id, dueDate: sql<string>`${tasks.dueDate}`, dueTime: tasks.dueTime })
      .from(tasks)
      .where(
        and(eq(tasks.userId, userId), isNull(tasks.completedAt), isNull(tasks.deletedAt), lt(tasks.dueDate, today)),
      );

    await setDueDates(db, userId, timezone, overdue.map((task) => ({ ...task, dueDate: today })));
    return c.json({ today, tasks: overdue.map(({ id, dueDate }) => ({ id, dueDate })) }, 200);
  })

  .post("/undo", validate("json", undoRescheduleSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const previous = c.req.valid("json").tasks;

    // Only the user's own tasks; their due times decide the reminders.
    const ids = JSON.stringify(previous.map(({ id }) => id));
    const owned = await db
      .select({ id: tasks.id, dueTime: tasks.dueTime })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, sql`(SELECT value FROM json_each(${ids}))`)));
    const dueTimes = new Map(owned.map((task) => [task.id, task.dueTime]));

    const changes = previous
      .filter((task) => dueTimes.has(task.id))
      .map((task) => ({ ...task, dueTime: dueTimes.get(task.id) ?? null }));
    const { timezone } = await getViewSettings(db, userId);
    await setDueDates(db, userId, timezone, changes);
    return c.json({ tasks: changes.map(({ id, dueDate }) => ({ id, dueDate })) }, 200);
  });
