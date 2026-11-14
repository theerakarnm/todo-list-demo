import type { Priority } from "../../shared/constants";
import { addDays, todayInTimeZone } from "../../shared/time-zone";
import type { SyncStore } from "./sync-store";
import type { Task } from "./types";

// What each view shows, computed from the one sync store (ARCHITECTURE §4 "Views").
// Pure functions: they take the store and the current time and never fetch.

/** Active = not completed and not deleted. Deleted rows never reach the store. */
export function isActive(task: Task) {
  return task.completedAt === null;
}

/** Manual order (Inbox, projects): the fractional-index position, creation time on a tie. */
export function compareByPosition<T extends { position: string; createdAt: number }>(a: T, b: T) {
  if (a.position !== b.position) return a.position < b.position ? -1 : 1;
  return a.createdAt - b.createdAt;
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };

/** Automatic order (Today, Upcoming): due time (none last), then priority high to none, then creation. */
export function compareForAutoSort(a: Task, b: Task) {
  if (a.dueTime !== b.dueTime) {
    if (a.dueTime === null) return 1;
    if (b.dueTime === null) return -1;
    return a.dueTime < b.dueTime ? -1 : 1;
  }
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.createdAt - b.createdAt;
}

function activeTasks(store: SyncStore) {
  return Object.values(store.tasks).filter(isActive);
}

/** Today's date ("2026-11-14") in the user's time zone. */
export function todayFor(store: SyncStore, now: number) {
  return todayInTimeZone(now, store.settings.timezone);
}

export function inboxTasks(store: SyncStore) {
  return activeTasks(store)
    .filter((task) => task.projectId === null)
    .sort(compareByPosition);
}

export function projectTasks(store: SyncStore, projectId: string) {
  return activeTasks(store)
    .filter((task) => task.projectId === projectId)
    .sort(compareByPosition);
}

/** Today = an overdue group and a due-today group, each sorted automatically. */
export function todayGroups(store: SyncStore, now: number) {
  const today = todayFor(store, now);
  const dated = activeTasks(store).filter((task) => task.dueDate !== null);
  return {
    today,
    overdue: dated.filter((task) => (task.dueDate ?? "") < today).sort(compareForAutoSort),
    dueToday: dated.filter((task) => task.dueDate === today).sort(compareForAutoSort),
  };
}

/** Upcoming = one entry per day from tomorrow, `rangeDays` days long; empty days are kept. */
export function upcomingDays(store: SyncStore, now: number, rangeDays: number) {
  const today = todayFor(store, now);
  const days = Array.from({ length: rangeDays }, (_, index) => addDays(today, index + 1));
  const tasks = activeTasks(store);
  return days.map((date) => ({ date, tasks: tasks.filter((task) => task.dueDate === date).sort(compareForAutoSort) }));
}

/** The numbers next to Inbox, Today and each project in the sidebar. */
export function sidebarCounts(store: SyncStore, now: number) {
  const today = todayFor(store, now);
  const counts = { inbox: 0, today: 0, projects: {} as Record<string, number> };
  for (const task of activeTasks(store)) {
    if (task.projectId === null) counts.inbox++;
    else counts.projects[task.projectId] = (counts.projects[task.projectId] ?? 0) + 1;
    if (task.dueDate !== null && task.dueDate <= today) counts.today++;
  }
  return counts;
}

export function sortedProjects(store: SyncStore) {
  return Object.values(store.projects).sort(compareByPosition);
}

/** The subtasks of one task, in position order. */
export function subtasksOf(store: SyncStore, taskId: string) {
  return Object.values(store.subtasks)
    .filter((subtask) => subtask.taskId === taskId)
    .sort(compareByPosition);
}

/** The images of one task, in gallery order. */
export function attachmentsOfTask(store: SyncStore, taskId: string) {
  return Object.values(store.attachments)
    .filter((attachment) => attachment.taskId === taskId)
    .sort(compareByPosition);
}

/** "2/5" on a task row: done and total subtasks per task id. Tasks without subtasks are left out. */
export function subtaskProgress(store: SyncStore) {
  const progress = new Map<string, { done: number; total: number }>();
  for (const subtask of Object.values(store.subtasks)) {
    const entry = progress.get(subtask.taskId) ?? { done: 0, total: 0 };
    entry.total++;
    if (subtask.completedAt !== null) entry.done++;
    progress.set(subtask.taskId, entry);
  }
  return progress;
}

/**
 * Completed tasks, newest completion first: the Logbook pages merged with tasks
 * completed on this device since (still in the store). A task unticked here is left out.
 * `projectId` narrows to one project (null = Inbox); leave it out for all tasks.
 */
export function completedTasks(store: SyncStore, logbook: Task[], projectId?: string | null) {
  const byId = new Map<string, Task>();
  for (const task of logbook) byId.set(task.id, task);
  for (const task of Object.values(store.tasks)) byId.set(task.id, task);
  return [...byId.values()]
    .filter((task) => task.completedAt !== null && (projectId === undefined || task.projectId === projectId))
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0) || (a.id < b.id ? 1 : -1));
}
