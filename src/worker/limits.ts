import { and, count, eq, isNull } from "drizzle-orm";
import { LIMITS } from "../shared/constants";
import type { Db } from "./db/client";
import { projects, subtasks, tasks } from "./db/schema";
import { ApiError } from "./errors";

// Every account limit lives here (ARCHITECTURE §4). Each check runs right
// before the write that would cross the limit and answers 409 with Thai text.

/** Active = not completed and not deleted. Creating, restoring and un-completing all add active tasks. */
export async function assertRoomForActiveTasks(db: Db, userId: string, adding = 1) {
  const [row] = await db
    .select({ active: count() })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.completedAt), isNull(tasks.deletedAt)));
  if ((row?.active ?? 0) + adding > LIMITS.activeTasksPerUser) throw new ApiError("TASK_LIMIT");
}

export async function assertRoomForProject(db: Db, userId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)));
  if ((row?.total ?? 0) + 1 > LIMITS.projectsPerUser) throw new ApiError("PROJECT_LIMIT");
}

export async function assertRoomForSubtask(db: Db, taskId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(subtasks)
    .where(and(eq(subtasks.taskId, taskId), isNull(subtasks.deletedAt)));
  if ((row?.total ?? 0) + 1 > LIMITS.subtasksPerTask) throw new ApiError("SUBTASK_LIMIT");
}
