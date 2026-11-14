import { and, eq, isNull } from "drizzle-orm";
import { ApiError } from "../errors";
import type { Db } from "./client";
import { projectColumns } from "./columns";
import { projects } from "./schema";

/** The user's project if it is not deleted. */
export function findUsableProject(db: Db, userId: string, projectId: string) {
  return db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
    .get();
}

/** A project the user may put tasks in: theirs and not deleted. Otherwise 404. */
export async function assertUsableProject(db: Db, userId: string, projectId: string) {
  if (!(await findUsableProject(db, userId, projectId))) throw new ApiError("NOT_FOUND");
}

/** The user's project with this id, deleted or not. 404 when it is missing or someone else's. */
export async function findOwnProject(db: Db, userId: string, id: string) {
  const project = await db
    .select(projectColumns)
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .get();
  if (!project) throw new ApiError("NOT_FOUND");
  return project;
}
