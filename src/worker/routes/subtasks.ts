import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { idParamSchema } from "../../shared/schemas/fields";
import { createSubtaskSchema, updateSubtaskSchema } from "../../shared/schemas/subtask";
import { createDb, type Db } from "../db/client";
import { subtaskColumns } from "../db/columns";
import { subtasks, tasks } from "../db/schema";
import { ApiError } from "../errors";
import { assertRoomForSubtask } from "../limits";
import { apiRateLimit } from "../middleware/api-rate-limit";
import { currentUser } from "../middleware/current-user";
import type { AppEnv } from "../types";
import { validate } from "../validate";

/** Subtasks live under a task that is the user's and not deleted. Otherwise 404. */
async function assertUsableTask(db: Db, userId: string, taskId: string) {
  const task = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
    .get();
  if (!task) throw new ApiError("NOT_FOUND");
}

async function findOwnSubtask(db: Db, userId: string, id: string) {
  const subtask = await db
    .select(subtaskColumns)
    .from(subtasks)
    .where(and(eq(subtasks.id, id), eq(subtasks.userId, userId)))
    .get();
  if (!subtask) throw new ApiError("NOT_FOUND");
  return subtask;
}

async function updateSubtask(db: Db, id: string, changes: Partial<typeof subtasks.$inferInsert>) {
  return db
    .update(subtasks)
    .set({ ...changes, updatedAt: Date.now() })
    .where(eq(subtasks.id, id))
    .returning(subtaskColumns)
    .get();
}

export const subtaskRoutes = new Hono<AppEnv>()
  .use(currentUser, apiRateLimit)

  // Create-or-update with the client's UUIDv7, so a retried create never duplicates.
  .put("/:id", validate("param", idParamSchema), validate("json", createSubtaskSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const { taskId, title, position } = c.req.valid("json");
    await assertUsableTask(db, userId, taskId);

    const existing = await db.select().from(subtasks).where(eq(subtasks.id, id)).get();
    if (existing && existing.userId !== userId) throw new ApiError("NOT_FOUND");
    // A subtask cannot move to another task.
    if (existing && existing.taskId !== taskId) throw new ApiError("VALIDATION_ERROR");

    if (existing) return c.json(await updateSubtask(db, id, { title, position }), 200);

    await assertRoomForSubtask(db, taskId);
    const now = Date.now();
    const created = await db
      .insert(subtasks)
      .values({ id, taskId, userId, title, position, createdAt: now, updatedAt: now })
      .returning(subtaskColumns)
      .get();
    return c.json(created, 200);
  })

  .patch("/:id", validate("param", idParamSchema), validate("json", updateSubtaskSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.valid("param");
    const subtask = await findOwnSubtask(db, c.get("userId"), id);
    if (subtask.deletedAt) throw new ApiError("NOT_FOUND");

    const { completed, ...plainFields } = c.req.valid("json");
    const completedAt = completed === undefined ? {} : { completedAt: completed ? (subtask.completedAt ?? Date.now()) : null };
    return c.json(await updateSubtask(db, id, { ...plainFields, ...completedAt }), 200);
  })

  .delete("/:id", validate("param", idParamSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.valid("param");
    const subtask = await findOwnSubtask(db, c.get("userId"), id);
    if (subtask.deletedAt) return c.json(subtask, 200);
    return c.json(await updateSubtask(db, id, { deletedAt: Date.now() }), 200);
  })

  .post("/:id/restore", validate("param", idParamSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const subtask = await findOwnSubtask(db, userId, id);
    if (!subtask.deletedAt) return c.json(subtask, 200);

    await assertUsableTask(db, userId, subtask.taskId);
    await assertRoomForSubtask(db, subtask.taskId);
    return c.json(await updateSubtask(db, id, { deletedAt: null }), 200);
  });
