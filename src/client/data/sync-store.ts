import type { Attachment, Project, Subtask, SyncResponse, Task, ViewSettings } from "./types";

type Row = { id: string; updatedAt: number; deletedAt: number | null };
export type RowsById<T> = Record<string, T>;

/**
 * Everything the app shows, in one TanStack Query cache entry fed by GET /api/sync.
 * Rows are kept by id, so a delta or an optimistic change touches only its own rows.
 * Completed tasks may be in here too; the view selectors decide what is shown.
 */
export type SyncStore = {
  tasks: RowsById<Task>;
  projects: RowsById<Project>;
  subtasks: RowsById<Subtask>;
  attachments: RowsById<Attachment>;
  settings: ViewSettings;
  cursor: number;
};

/**
 * Applies changed rows. A row only replaces a copy that is not newer
 * (the overlapping cursor can send a row twice), and tombstones remove rows.
 */
function mergeRows<T extends Row>(current: RowsById<T>, changed: T[]) {
  const next = { ...current };
  for (const row of changed) {
    const existing = next[row.id];
    if (existing && existing.updatedAt > row.updatedAt) continue;
    if (row.deletedAt) delete next[row.id];
    else next[row.id] = row;
  }
  return next;
}

export type ChangedRows = { tasks?: Task[]; projects?: Project[]; subtasks?: Subtask[]; attachments?: Attachment[] };

/** The store with rows from the server applied: a sync delta or a mutation's answer. */
export function applyRows<Store extends Omit<SyncStore, "settings" | "cursor">>(store: Store, rows: ChangedRows): Store {
  return {
    ...store,
    tasks: mergeRows(store.tasks, rows.tasks ?? []),
    projects: mergeRows(store.projects, rows.projects ?? []),
    subtasks: mergeRows(store.subtasks, rows.subtasks ?? []),
    attachments: mergeRows(store.attachments, rows.attachments ?? []),
  };
}

/** The store after a sync response: the first one (no store yet) is the full load. */
export function mergeSync(store: SyncStore | undefined, response: SyncResponse): SyncStore {
  const base = store ?? { tasks: {}, projects: {}, subtasks: {}, attachments: {} };
  return { ...applyRows(base, response), settings: response.settings, cursor: response.cursor };
}
