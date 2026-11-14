import { env } from "cloudflare:test";
import { newId } from "./ids";

type SeedOptions = { completedAt?: number | null; projectId?: string | null; title?: string };

/**
 * Inserts `count` tasks in one statement (a recursive CTE), so limit tests
 * can fill an account with 1,000 tasks quickly. Ids are "<prefix>-<n>".
 */
export async function seedTasks(userId: string, count: number, options: SeedOptions = {}) {
  const prefix = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?1)
     INSERT INTO tasks (id, user_id, project_id, title, position, completed_at, created_at, updated_at)
     SELECT ?2 || '-' || i, ?3, ?4, ?5, 'a0', ?6, ?7, ?7 FROM n`,
  )
    .bind(count, prefix, userId, options.projectId ?? null, options.title ?? "งานเก่า", options.completedAt ?? null, now)
    .run();
  return prefix;
}

/** Inserts one project straight into D1 and returns its id. */
export async function insertProject(userId: string, { deletedAt = null as number | null } = {}) {
  const id = newId();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO projects (id, user_id, name, color, position, created_at, updated_at, deleted_at) VALUES (?, ?, 'งาน', 'blue', 'a0', ?, ?, ?)",
  )
    .bind(id, userId, now, now, deletedAt)
    .run();
  return id;
}

/** Inserts one subtask straight into D1 and returns its id. */
export async function insertSubtask(userId: string, taskId: string) {
  const id = newId();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO subtasks (id, task_id, user_id, title, position, created_at, updated_at) VALUES (?, ?, ?, 'ซื้ออะไหล่', 'a0', ?, ?)",
  )
    .bind(id, taskId, userId, now, now)
    .run();
  return id;
}

/** Inserts `count` projects in one statement, for the project limit test. */
export async function seedProjects(userId: string, count: number) {
  const prefix = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?1)
     INSERT INTO projects (id, user_id, name, color, position, created_at, updated_at)
     SELECT ?2 || '-' || i, ?3, 'โปรเจกต์', 'blue', 'a0', ?4, ?4 FROM n`,
  )
    .bind(count, prefix, userId, now)
    .run();
}

/** Inserts `count` subtasks under one task in one statement, for the subtask limit test. */
export async function seedSubtasks(userId: string, taskId: string, count: number) {
  const prefix = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?1)
     INSERT INTO subtasks (id, task_id, user_id, title, position, created_at, updated_at)
     SELECT ?2 || '-' || i, ?3, ?4, 'ขั้นตอน', 'a0', ?5, ?5 FROM n`,
  )
    .bind(count, prefix, taskId, userId, now)
    .run();
}
