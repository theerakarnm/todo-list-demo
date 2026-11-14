import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "../api/error-message";
import { useToast } from "../toast/ToastProvider";
import { SYNC_QUERY_KEY } from "./sync-query";
import { applyRows, type ChangedRows, type SyncStore } from "./sync-store";

const TABLES = ["tasks", "projects", "subtasks"] as const;
type Table = (typeof TABLES)[number];
type RowChange = { table: Table; id: string; previous: unknown };

/**
 * Every write goes to the server one at a time, in the order the user made it,
 * so e.g. a subtask is never created before its task, or a restore before its delete.
 */
const WRITE_SCOPE = { id: "api-writes" };

/** The rows `after` differs in, with their value in `before` (undefined = the row was not there). */
function changedRows(before: SyncStore, after: SyncStore): RowChange[] {
  return TABLES.flatMap((table) => {
    const ids = new Set([...Object.keys(before[table]), ...Object.keys(after[table])]);
    return [...ids]
      .filter((id) => before[table][id] !== after[table][id])
      .map((id) => ({ table, id, previous: before[table][id] }));
  });
}

/** Puts back just these rows, so changes made meanwhile by other mutations stay. */
function rollBack(queryClient: QueryClient, changes: RowChange[]) {
  queryClient.setQueryData<SyncStore>(SYNC_QUERY_KEY, (store) => {
    if (!store) return store;
    const next = { ...store, tasks: { ...store.tasks }, projects: { ...store.projects }, subtasks: { ...store.subtasks } };
    for (const { table, id, previous } of changes) {
      const rows = next[table] as Record<string, unknown>;
      if (previous === undefined) delete rows[id];
      else rows[id] = previous;
    }
    return next;
  });
}

type OptimisticMutation<Variables, Result> = {
  /** The API call. */
  request: (variables: Variables) => Promise<Result>;
  /** The store as it should look right away, before the server answers. */
  apply: (store: SyncStore, variables: Variables) => SyncStore;
  /** The rows in the server's answer, written over the optimistic ones. */
  confirm?: (result: Result) => ChangedRows;
  onSuccess?: (result: Result, variables: Variables) => void;
  /** Runs after success or failure, e.g. to refresh the Logbook. */
  onSettled?: () => void;
};

/**
 * A mutation that updates the screen first and syncs in the background
 * (ARCHITECTURE §7). If the server says no, its rows roll back and a Thai toast explains why.
 */
export function useOptimisticMutation<Variables, Result>(mutation: OptimisticMutation<Variables, Result>) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    scope: WRITE_SCOPE,
    mutationFn: mutation.request,
    onMutate: async (variables: Variables) => {
      // A poll already on its way would bring back the old rows.
      await queryClient.cancelQueries({ queryKey: SYNC_QUERY_KEY });
      const before = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
      if (!before) return { changes: [] };
      const after = mutation.apply(before, variables);
      queryClient.setQueryData(SYNC_QUERY_KEY, after);
      return { changes: changedRows(before, after) };
    },
    onError: (error, _variables, context) => {
      if (context) rollBack(queryClient, context.changes);
      showToast({ tone: "error", message: apiErrorMessage(t, error) });
    },
    onSuccess: (result, variables) => {
      const rows = mutation.confirm?.(result);
      if (rows) queryClient.setQueryData<SyncStore>(SYNC_QUERY_KEY, (store) => store && applyRows(store, rows));
      mutation.onSuccess?.(result, variables);
    },
    onSettled: mutation.onSettled,
  });
}
