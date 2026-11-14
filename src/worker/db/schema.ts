import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { PRIORITIES, PROJECT_COLORS, START_PAGES, THEMES, WEEK_STARTS } from "../../shared/constants";
import { user } from "./auth-schema";

export * from "./auth-schema";

// App tables. Ids are client-made UUIDv7 strings.
// Timestamps are UTC epoch milliseconds set by the server.

const userId = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

const epochMs = (name: string) => integer(name, { mode: "number" });

export const userSettings = sqliteTable("user_settings", {
  userId: userId().primaryKey(),
  displayName: text("display_name").notNull(),
  avatarKey: text("avatar_key"),
  timezone: text("timezone").notNull(),
  theme: text("theme", { enum: THEMES }).notNull().default("system"),
  startPage: text("start_page", { enum: START_PAGES }).notNull().default("today"),
  weekStart: text("week_start", { enum: WEEK_STARTS }).notNull().default("mon"),
  digestEnabled: integer("digest_enabled", { mode: "boolean" }).notNull().default(false),
  digestTime: text("digest_time").notNull().default("08:00"),
  digestSentOn: text("digest_sent_on"),
  onboardedAt: epochMs("onboarded_at"),
});

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: userId(),
    name: text("name").notNull(),
    color: text("color", { enum: PROJECT_COLORS }).notNull(),
    position: text("position").notNull(),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
    deletedAt: epochMs("deleted_at"),
  },
  (table) => [index("projects_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: userId(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("none"),
    dueDate: text("due_date"),
    dueTime: text("due_time"),
    remindAt: epochMs("remind_at"),
    reminderSentAt: epochMs("reminder_sent_at"),
    position: text("position").notNull(),
    completedAt: epochMs("completed_at"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
    deletedAt: epochMs("deleted_at"),
  },
  (table) => [
    index("tasks_user_updated_idx").on(table.userId, table.updatedAt),
    index("tasks_user_completed_idx").on(table.userId, table.completedAt),
    index("tasks_pending_reminder_idx").on(table.remindAt).where(sql`${table.reminderSentAt} IS NULL`),
  ],
);

export const subtasks = sqliteTable(
  "subtasks",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: userId(),
    title: text("title").notNull(),
    completedAt: epochMs("completed_at"),
    position: text("position").notNull(),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
    deletedAt: epochMs("deleted_at"),
  },
  (table) => [index("subtasks_task_idx").on(table.taskId)],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: userId(),
    r2Key: text("r2_key").notNull(),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    position: text("position").notNull(),
    createdAt: epochMs("created_at").notNull(),
    deletedAt: epochMs("deleted_at"),
  },
  (table) => [index("attachments_task_idx").on(table.taskId)],
);

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: userId(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: epochMs("created_at").notNull(),
  },
  (table) => [index("push_subscriptions_user_idx").on(table.userId)],
);
