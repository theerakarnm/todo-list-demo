import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { idParamSchema } from "../../shared/schemas/fields";
import { createTaskSchema, type UpdateTaskInput, updateTaskSchema } from "../../shared/schemas/task";
import { createDb, type Db } from "../db/client";
import { taskColumns } from "../db/columns";
import { assertUsableProject, findUsableProject } from "../db/project-queries";
import { findOwnTask, isSameDue, positionAtEndOfList, reminderFor } from "../db/task-queries";
import { attachments, subtasks, tasks } from "../db/schema";
import { ApiError } from "../errors";
import { assertRoomForActiveTasks } from "../limits";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";
import { validate } from "../validate";
import { taskAttachmentRoutes } from "./attachments";
import { rescheduleOverdueRoutes } from "./reschedule-overdue";

type Task = typeof tasks.$inferSelect;
type Due = Pick<Task, "dueDate" | "dueTime">;

/** The due date and time after a PATCH. Clearing the date clears the time too. */
function dueAfterPatch(task: Due, patch: UpdateTaskInput) {
  const dueDate = patch.dueDate === undefined ? task.dueDate : patch.dueDate;
  const keptTime = patch.dueDate === null ? null : task.dueTime;
  const dueTime = patch.dueTime === undefined ? keptTime : patch.dueTime;
  if (dueTime && !dueDate) throw new ApiError("VALIDATION_ERROR");
  return { dueDate, dueTime };
}

async function updateTask(db: Db, userId: string, id: string, changes: Partial<Task>) {
  const updated = await db
    .update(tasks)
    .set({ ...changes, updatedAt: Date.now() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning(taskColumns)
    .get();
  if (!updated) throw new ApiError("NOT_FOUND");
  return updated;
}

export const taskRoutes = new Hono<SessionEnv>()
  .use(requireSession)
  .route("/reschedule-overdue", rescheduleOverdueRoutes)
  .route("/:id/attachments", taskAttachmentRoutes)

  // Create-or-update with the client's UUIDv7, so a retried create never duplicates.
  .put("/:id", validate("param", idParamSchema), validate("json", createTaskSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    if (body.projectId) await assertUsableProject(db, userId, body.projectId);

    const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (existing && existing.userId !== userId) throw new ApiError("NOT_FOUND");

    if (existing) {
      const reminder = isSameDue(existing, body) ? {} : await reminderFor(db, userId, body);
      return c.json(await updateTask(db, userId, id, { ...body, ...reminder }), 200);
    }

    await assertRoomForActiveTasks(db, userId);
    const now = Date.now();
    const created = await db
      .insert(tasks)
      .values({ ...body, ...(await reminderFor(db, userId, body)), id, userId, createdAt: now, updatedAt: now })
      .returning(taskColumns)
      .get();
    return c.json(created, 200);
  })

  .patch("/:id", validate("param", idParamSchema), validate("json", updateTaskSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const patch = c.req.valid("json");
    const task = await findOwnTask(db, userId, id);
    if (task.deletedAt) throw new ApiError("NOT_FOUND");

    const { completed, projectId, dueDate: _dueDate, dueTime: _dueTime, ...plainFields } = patch;
    const changes: Partial<Task> = plainFields;

    if (projectId !== undefined && projectId !== task.projectId) {
      if (projectId) await assertUsableProject(db, userId, projectId);
      changes.projectId = projectId;
      changes.position = patch.position ?? (await positionAtEndOfList(db, userId, projectId));
    }

    const due = dueAfterPatch(task, patch);
    if (!isSameDue(task, due)) Object.assign(changes, due, await reminderFor(db, userId, due));

    if (completed === true && !task.completedAt) changes.completedAt = Date.now();
    if (completed === false && task.completedAt) {
      await assertRoomForActiveTasks(db, userId);
      changes.completedAt = null;
    }

    return c.json(await updateTask(db, userId, id, changes), 200);
  })

  // Soft delete, so Undo can restore. The subtasks and images get the same deleted_at,
  // which is how restore knows which ones to bring back. Image files stay in R2
  // until the purge job removes them with the rows.
  .delete("/:id", validate("param", idParamSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const task = await findOwnTask(db, userId, id);
    if (task.deletedAt) return c.json(task, 200);

    const now = Date.now();
    const [, , deleted] = await db.batch([
      db
        .update(subtasks)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(subtasks.taskId, id), isNull(subtasks.deletedAt))),
      db
        .update(attachments)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(attachments.taskId, id), isNull(attachments.deletedAt))),
      db.update(tasks).set({ deletedAt: now, updatedAt: now }).where(eq(tasks.id, id)).returning(taskColumns),
    ]);
    return c.json(deleted[0], 200);
  })

  .post("/:id/restore", validate("param", idParamSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const task = await findOwnTask(db, userId, id);
    if (!task.deletedAt) return c.json(task, 200);
    if (!task.completedAt) await assertRoomForActiveTasks(db, userId);

    // A task whose project is gone comes back in the Inbox.
    const projectGone = task.projectId && !(await findUsableProject(db, userId, task.projectId));
    const placement = projectGone ? { projectId: null, position: await positionAtEndOfList(db, userId, null) } : {};

    const now = Date.now();
    const [, , restored] = await db.batch([
      db
        .update(subtasks)
        .set({ deletedAt: null, updatedAt: now })
        .where(and(eq(subtasks.taskId, id), eq(subtasks.deletedAt, task.deletedAt))),
      db
        .update(attachments)
        .set({ deletedAt: null, updatedAt: now })
        .where(and(eq(attachments.taskId, id), eq(attachments.deletedAt, task.deletedAt))),
      db
        .update(tasks)
        .set({ ...placement, deletedAt: null, updatedAt: now })
        .where(eq(tasks.id, id))
        .returning(taskColumns),
    ]);
    return c.json(restored[0], 200);
  });
