import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

async function namesInSchema(type: "table" | "index") {
  const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = ?")
    .bind(type)
    .all<{ name: string }>();
  return results.map((row) => row.name);
}

describe("D1 migrations", () => {
  it("create every Better Auth and app table", async () => {
    const tables = await namesInSchema("table");
    expect(tables).toEqual(
      expect.arrayContaining([
        "user",
        "session",
        "account",
        "verification",
        "user_settings",
        "projects",
        "tasks",
        "subtasks",
        "attachments",
        "push_subscriptions",
        "cron_runs",
      ]),
    );
  });

  it("create the indexes the sync, logbook and reminder queries need", async () => {
    const indexes = await namesInSchema("index");
    expect(indexes).toEqual(
      expect.arrayContaining([
        "tasks_user_updated_idx",
        "tasks_user_completed_idx",
        "tasks_pending_reminder_idx",
        "projects_user_updated_idx",
        "subtasks_task_idx",
        "attachments_user_updated_idx",
      ]),
    );
  });

  it("give attachments a required updated_at for sync deltas", async () => {
    const { results } = await env.DB.prepare("SELECT name, \"notnull\" FROM pragma_table_info('attachments')").all<{
      name: string;
      notnull: number;
    }>();
    expect(results).toContainEqual({ name: "updated_at", notnull: 1 });
  });

  it("make the reminder index partial, so sent reminders drop out of it", async () => {
    const row = await env.DB.prepare("SELECT sql FROM sqlite_master WHERE name = ?")
      .bind("tasks_pending_reminder_idx")
      .first<{ sql: string }>();
    expect(row?.sql).toMatch(/WHERE\s+("tasks"\.)?"reminder_sent_at"\s+IS NULL/i);
  });
});
