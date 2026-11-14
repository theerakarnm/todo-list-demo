import { and, asc, desc, eq, isNull, or, type SQL, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";
import { LIMITS } from "../../shared/constants";
import { searchQuerySchema } from "../../shared/schemas/queries";
import { createDb } from "../db/client";
import { projectColumns, taskColumns } from "../db/columns";
import { projects, tasks } from "../db/schema";
import { subtasksOfTasks } from "../db/task-queries";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";
import { validate } from "../validate";

/**
 * `column LIKE '%query%'`, with the query's own \, % and _ escaped so they match
 * literally. A plain substring match (no FTS5) also finds Thai words in the
 * middle of a sentence, which has no spaces between words (ARCHITECTURE §5).
 */
function contains(column: SQLiteColumn, query: string): SQL {
  const escaped = query.replace(/[\\%_]/g, (character) => `\\${character}`);
  return sql`${column} LIKE ${`%${escaped}%`} ESCAPE '\\'`;
}

export const searchRoutes = new Hono<SessionEnv>()
  .use(requireSession)

  // Active and completed tasks (title or notes) plus projects (name). Active tasks first.
  // The tasks' subtasks come too: a completed task is not in the client's store yet.
  .get("/", validate("query", searchQuerySchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { q } = c.req.valid("query");

    const [taskRows, projectRows] = await db.batch([
      db
        .select(taskColumns)
        .from(tasks)
        .where(
          and(eq(tasks.userId, userId), isNull(tasks.deletedAt), or(contains(tasks.title, q), contains(tasks.notes, q))),
        )
        .orderBy(sql`${tasks.completedAt} IS NOT NULL`, desc(tasks.updatedAt))
        .limit(LIMITS.searchResults),
      db
        .select(projectColumns)
        .from(projects)
        .where(and(eq(projects.userId, userId), isNull(projects.deletedAt), contains(projects.name, q)))
        .orderBy(asc(projects.position))
        .limit(LIMITS.searchResults),
    ]);
    const subtaskRows = await subtasksOfTasks(db, userId, taskRows.map((task) => task.id));
    return c.json({ tasks: taskRows, projects: projectRows, subtasks: subtaskRows }, 200);
  });
