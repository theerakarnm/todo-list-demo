import { generateKeyBetween } from "fractional-indexing";
import type { ChangedRows, SyncStore } from "./sync-store";

// Small immutable edits for optimistic updates. Unlike applyRows, these
// always win: they show what the user just did, before the server answers.

/** Writes these rows into the store, replacing any copy. */
export function putRows(store: SyncStore, rows: ChangedRows): SyncStore {
  const byId = <T extends { id: string }>(current: Record<string, T>, list: T[] = []) =>
    list.length === 0 ? current : { ...current, ...Object.fromEntries(list.map((row) => [row.id, row])) };
  return {
    ...store,
    tasks: byId(store.tasks, rows.tasks),
    projects: byId(store.projects, rows.projects),
    subtasks: byId(store.subtasks, rows.subtasks),
  };
}

type Ids = { tasks?: string[]; projects?: string[]; subtasks?: string[] };

/** Takes these rows out of the store (an optimistic delete). */
export function removeRows(store: SyncStore, ids: Ids): SyncStore {
  const without = <T>(current: Record<string, T>, list: string[] = []) => {
    if (list.length === 0) return current;
    const next = { ...current };
    for (const id of list) delete next[id];
    return next;
  };
  return {
    ...store,
    tasks: without(store.tasks, ids.tasks),
    projects: without(store.projects, ids.projects),
    subtasks: without(store.subtasks, ids.subtasks),
  };
}

/** A fractional-index position after the last of `sortedRows`, i.e. at the end of the list. */
export function positionAtEnd(sortedRows: { position: string }[]) {
  return generateKeyBetween(sortedRows.at(-1)?.position ?? null, null);
}
