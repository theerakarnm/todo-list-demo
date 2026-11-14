import type { Project, Subtask, Task } from "./types";

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
