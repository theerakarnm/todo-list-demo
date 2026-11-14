import type { SyncStore } from "./sync-store";
import type { Attachment, Project, Subtask, Task } from "./types";

// Rows for tests, with every column filled in. Pass only what the test is about.

export function aTask(fields: Partial<Task> & Pick<Task, "id">): Task {
  return {
    projectId: null,
    title: `task ${fields.id}`,
    notes: "",
    priority: "none",
    dueDate: null,
    dueTime: null,
    remindAt: null,
    reminderSentAt: null,
    position: "a0",
    completedAt: null,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    ...fields,
  };
}

export function aProject(fields: Partial<Project> & Pick<Project, "id">): Project {
  return {
    name: `project ${fields.id}`,
    color: "blue",
    position: "a0",
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    ...fields,
  };
}

export function aSubtask(fields: Partial<Subtask> & Pick<Subtask, "id" | "taskId">): Subtask {
  return {
    title: `subtask ${fields.id}`,
    completedAt: null,
    position: "a0",
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    ...fields,
  };
}

export function anAttachment(fields: Partial<Attachment> & Pick<Attachment, "id" | "taskId">): Attachment {
  return {
    r2Key: `u/user-1/t/${fields.taskId}/${fields.id}`,
    mime: "image/webp",
    bytes: 1000,
    width: 800,
    height: 600,
    position: "a0",
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    ...fields,
  };
}

/** A sync store holding these rows, in Bangkok time unless told otherwise. */
export function storeWith(
  rows: { tasks?: Task[]; projects?: Project[]; subtasks?: Subtask[]; attachments?: Attachment[] },
  timezone = "Asia/Bangkok",
): SyncStore {
  const byId = <T extends { id: string }>(list: T[] = []) => Object.fromEntries(list.map((row) => [row.id, row]));
  return {
    tasks: byId(rows.tasks),
    projects: byId(rows.projects),
    subtasks: byId(rows.subtasks),
    attachments: byId(rows.attachments),
    settings: { timezone, weekStart: "mon" },
    cursor: 0,
  };
}
