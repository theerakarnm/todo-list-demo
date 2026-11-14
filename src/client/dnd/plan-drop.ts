import { positionForMove } from "../data/positions";
import { inboxTasks, projectTasks, sortedProjects } from "../data/selectors";
import type { SyncStore } from "../data/sync-store";
import type { Project, Task } from "../data/types";

/** What is being dragged. Rows are looked up by id at drop time, so the newest copy is used. */
export type DragItem = { type: "task" | "project"; id: string };
/** Where it can be dropped: another task in the list, a sidebar project or an Upcoming day. */
export type DropTarget = { type: "task" | "project" | "day"; id: string };

export type DropPlan =
  | { kind: "taskPosition"; task: Task; position: string }
  | { kind: "taskProject"; task: Task; projectId: string }
  | { kind: "taskDueDate"; task: Task; dueDate: string }
  | { kind: "projectPosition"; project: Project; position: string };

/** The new position of `id` once it takes the place of `overId` in `sortedRows`; null if no move. */
function moveWithin<T extends { id: string; position: string }>(sortedRows: T[], id: string, overId: string) {
  const fromIndex = sortedRows.findIndex((row) => row.id === id);
  const toIndex = sortedRows.findIndex((row) => row.id === overId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null;
  return positionForMove(sortedRows, fromIndex, toIndex);
}

function planTaskDrop(store: SyncStore, task: Task, over: DropTarget): DropPlan | null {
  if (over.type === "project") {
    return task.projectId === over.id ? null : { kind: "taskProject", task, projectId: over.id };
  }
  if (over.type === "day") {
    return task.dueDate === over.id ? null : { kind: "taskDueDate", task, dueDate: over.id };
  }
  // On another task: reorder within the task's own list (Inbox or its project).
  const list = task.projectId ? projectTasks(store, task.projectId) : inboxTasks(store);
  const position = moveWithin(list, task.id, over.id);
  return position ? { kind: "taskPosition", task, position } : null;
}

/** The one change a drop makes, or null when it changes nothing. A pure function, so it is unit-tested. */
export function planDrop(store: SyncStore, active: DragItem, over: DropTarget | undefined): DropPlan | null {
  if (!over) return null;
  if (active.type === "task") {
    const task = store.tasks[active.id];
    return task ? planTaskDrop(store, task, over) : null;
  }
  const project = store.projects[active.id];
  if (!project || over.type !== "project") return null;
  const position = moveWithin(sortedProjects(store), project.id, over.id);
  return position ? { kind: "projectPosition", project, position } : null;
}
