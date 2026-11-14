import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { Hono } from "hono";
import { syncQuerySchema } from "../../shared/schemas/queries";
import { createDb, type Db } from "../db/client";
import { projectColumns, subtaskColumns, taskColumns } from "../db/columns";
import { projects, subtasks, tasks } from "../db/schema";
import { getViewSettings } from "../db/settings-queries";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";
import { validate } from "../validate";

/**
 * The cursor is the request's start time minus this overlap. A write takes
 * its updated_at before it reaches D1, so it can land just after our read
 * with an older timestamp; the overlap makes the next poll pick it up.
 * Rows sent twice are harmless: the client keeps the row with the latest updated_at.
 */
const CURSOR_OVERLAP_MS = 30_000;

/** First load: active tasks, live projects and the subtasks of those tasks. Completed tasks come from the Logbook. */
function fullLoad(db: Db, userId: string) {
  const activeTasks = and(eq(tasks.userId, userId), isNull(tasks.completedAt), isNull(tasks.deletedAt));
  return db.batch([
    db.select(taskColumns).from(tasks).where(activeTasks),
    db
      .select(projectColumns)
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt))),
    db
      .select(subtaskColumns)
      .from(subtasks)
      .where(
        and(
          eq(subtasks.userId, userId),
          isNull(subtasks.deletedAt),
          inArray(subtasks.taskId, db.select({ id: tasks.id }).from(tasks).where(activeTasks)),
        ),
      ),
  ]);
}

/**
 * Everything that changed after `since`, tombstones and completed tasks included.
 * A changed task brings all its subtasks, so a task that comes back
 * (un-completed) arrives with the subtasks this device never loaded.
 */
function changesSince(db: Db, userId: string, since: number) {
  const changedTasks = and(eq(tasks.userId, userId), gt(tasks.updatedAt, since));
  return db.batch([
    db.select(taskColumns).from(tasks).where(changedTasks),
    db
      .select(projectColumns)
      .from(projects)
      .where(and(eq(projects.userId, userId), gt(projects.updatedAt, since))),
    db
      .select(subtaskColumns)
      .from(subtasks)
      .where(
        and(
          eq(subtasks.userId, userId),
          or(
            gt(subtasks.updatedAt, since),
            inArray(subtasks.taskId, db.select({ id: tasks.id }).from(tasks).where(changedTasks)),
          ),
        ),
      ),
  ]);
}

export const syncRoutes = new Hono<SessionEnv>()
  .use(requireSession)
  .get("/", validate("query", syncQuerySchema), async (c) => {
    const cursor = Date.now() - CURSOR_OVERLAP_MS;
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { since } = c.req.valid("query");

    // One batch is one D1 transaction, so the three lists agree with each other.
    const [taskRows, projectRows, subtaskRows] =
      since === undefined ? await fullLoad(db, userId) : await changesSince(db, userId, since);
    const settings = await getViewSettings(db, userId);

    return c.json({ tasks: taskRows, projects: projectRows, subtasks: subtaskRows, settings, cursor }, 200);
  });
