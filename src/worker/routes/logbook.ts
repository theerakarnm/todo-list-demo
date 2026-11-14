import { and, desc, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { Hono } from "hono";
import { LIMITS } from "../../shared/constants";
import { logbookQuerySchema } from "../../shared/schemas/queries";
import { createDb } from "../db/client";
import { taskColumns } from "../db/columns";
import { tasks } from "../db/schema";
import { apiRateLimit } from "../middleware/api-rate-limit";
import { currentUser } from "../middleware/current-user";
import type { AppEnv } from "../types";
import { validate } from "../validate";

/** Tasks after the previous page's last one, in (completed_at, id) newest-first order. */
function afterCursor(before?: number, beforeId?: string) {
  if (before === undefined) return undefined;
  if (beforeId === undefined) return lt(tasks.completedAt, before);
  return or(lt(tasks.completedAt, before), and(eq(tasks.completedAt, before), lt(tasks.id, beforeId)));
}

export const logbookRoutes = new Hono<AppEnv>()
  .use(currentUser, apiRateLimit)

  // Completed tasks, newest completion first, 50 a page. The id breaks ties,
  // so tasks completed in the same millisecond are never skipped or repeated.
  .get("/", validate("query", logbookQuerySchema), async (c) => {
    const db = createDb(c.env.DB);
    const { before, beforeId } = c.req.valid("query");

    const rows = await db
      .select(taskColumns)
      .from(tasks)
      .where(
        and(eq(tasks.userId, c.get("userId")), isNotNull(tasks.completedAt), isNull(tasks.deletedAt), afterCursor(before, beforeId)),
      )
      .orderBy(desc(tasks.completedAt), desc(tasks.id))
      // One extra row tells us whether there is a next page.
      .limit(LIMITS.logbookPageSize + 1);

    const pageRows = rows.slice(0, LIMITS.logbookPageSize);
    const last = pageRows.at(-1);
    const next =
      rows.length > LIMITS.logbookPageSize && last?.completedAt
        ? { before: last.completedAt, beforeId: last.id }
        : null;
    return c.json({ tasks: pageRows, next }, 200);
  });
