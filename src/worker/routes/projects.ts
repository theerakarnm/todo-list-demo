import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { idParamSchema } from "../../shared/schemas/fields";
import { createProjectSchema, updateProjectSchema } from "../../shared/schemas/project";
import { createDb } from "../db/client";
import { projectColumns } from "../db/columns";
import { findOwnProject } from "../db/project-queries";
import { projects, subtasks, tasks } from "../db/schema";
import { ApiError } from "../errors";
import { assertRoomForActiveTasks, assertRoomForProject } from "../limits";
import { apiRateLimit } from "../middleware/api-rate-limit";
import { currentUser } from "../middleware/current-user";
import type { AppEnv } from "../types";
import { validate } from "../validate";

export const projectRoutes = new Hono<AppEnv>()
  .use(currentUser, apiRateLimit)

  // Create-or-update with the client's UUIDv7, so a retried create never duplicates.
  .put("/:id", validate("param", idParamSchema), validate("json", createProjectSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const existing = await db.select({ userId: projects.userId }).from(projects).where(eq(projects.id, id)).get();
    if (existing && existing.userId !== userId) throw new ApiError("NOT_FOUND");

    const now = Date.now();
    if (existing) {
      const updated = await db
        .update(projects)
        .set({ ...body, updatedAt: now })
        .where(eq(projects.id, id))
        .returning(projectColumns)
        .get();
      return c.json(updated, 200);
    }

    await assertRoomForProject(db, userId);
    const created = await db
      .insert(projects)
      .values({ ...body, id, userId, createdAt: now, updatedAt: now })
      .returning(projectColumns)
      .get();
    return c.json(created, 200);
  })

  .patch("/:id", validate("param", idParamSchema), validate("json", updateProjectSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const project = await findOwnProject(db, userId, id);
    if (project.deletedAt) throw new ApiError("NOT_FOUND");

    const updated = await db
      .update(projects)
      .set({ ...c.req.valid("json"), updatedAt: Date.now() })
      .where(eq(projects.id, id))
      .returning(projectColumns)
      .get();
    return c.json(updated, 200);
  })

  // Soft-deletes the project, its tasks and their subtasks with one deleted_at,
  // so restore can bring back exactly those rows.
  .delete("/:id", validate("param", idParamSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const project = await findOwnProject(db, userId, id);
    if (project.deletedAt) return c.json(project, 200);

    const now = Date.now();
    const tombstone = { deletedAt: now, updatedAt: now };
    const liveTasks = and(eq(tasks.userId, userId), eq(tasks.projectId, id), isNull(tasks.deletedAt));
    const liveTaskIds = db.select({ id: tasks.id }).from(tasks).where(liveTasks);

    const [, , deleted] = await db.batch([
      db
        .update(subtasks)
        .set(tombstone)
        .where(and(inArray(subtasks.taskId, liveTaskIds), isNull(subtasks.deletedAt))),
      db.update(tasks).set(tombstone).where(liveTasks),
      db.update(projects).set(tombstone).where(eq(projects.id, id)).returning(projectColumns),
    ]);
    return c.json(deleted[0], 200);
  })

  .post("/:id/restore", validate("param", idParamSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const project = await findOwnProject(db, userId, id);
    if (!project.deletedAt) return c.json(project, 200);

    const deletedWithProject = and(
      eq(tasks.userId, userId),
      eq(tasks.projectId, id),
      eq(tasks.deletedAt, project.deletedAt),
    );
    const [comingBack] = await db
      .select({ active: count() })
      .from(tasks)
      .where(and(deletedWithProject, isNull(tasks.completedAt)));
    await assertRoomForProject(db, userId);
    await assertRoomForActiveTasks(db, userId, comingBack?.active ?? 0);

    const now = Date.now();
    const alive = { deletedAt: null, updatedAt: now };
    const taskIds = db.select({ id: tasks.id }).from(tasks).where(deletedWithProject);

    const [, , restored] = await db.batch([
      db
        .update(subtasks)
        .set(alive)
        .where(and(inArray(subtasks.taskId, taskIds), eq(subtasks.deletedAt, project.deletedAt))),
      db.update(tasks).set(alive).where(deletedWithProject),
      db.update(projects).set(alive).where(eq(projects.id, id)).returning(projectColumns),
    ]);
    return c.json(restored[0], 200);
  });
