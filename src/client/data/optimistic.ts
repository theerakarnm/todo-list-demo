import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "../api/error-message";
import { useToast } from "../toast/ToastProvider";
import { SYNC_QUERY_KEY } from "./sync-query";
import { applyRows, type ChangedRows, type SyncStore } from "./sync-store";

const TABLES = ["tasks", "projects", "subtasks"] as const;
type Table = (typeof TABLES)[number];
/** A row a mutation changed: its value before (undefined = it created the row) and the value it wrote. */
type RowChange = { table: Table; id: string; previous: unknown; written: unknown };

/**
 * Every write goes to the server one at a time, in the order the user made it,
 * so e.g. a subtask is never created before its task, or a restore before its delete.
 */
const WRITE_SCOPE = { id: "api-writes" };

function changedRows(before: SyncStore, after: SyncStore): RowChange[] {
  return TABLES.flatMap((table) => {
    const ids = new Set([...Object.keys(before[table]), ...Object.keys(after[table])]);
    return [...ids]
      .filter((id) => before[table][id] !== after[table][id])
      .map((id) => ({ table, id, previous: before[table][id], written: after[table][id] }));
  });
}

/**
 * Undoes just this mutation's rows. A row it created always goes (no ghost of a
 * failed create); any other row goes back only if nothing has changed it since,
 * so later edits and server answers are kept.
 */
function rollBack(queryClient: QueryClient, changes: RowChange[]) {
  queryClient.setQueryData<SyncStore>(SYNC_QUERY_KEY, (store) => {
    if (!store) return store;
    const next = { ...store, tasks: { ...store.tasks }, projects: { ...store.projects }, subtasks: { ...store.subtasks } };
    for (const { table, id, previous, written } of changes) {
      const rows = next[table] as Record<string, unknown>;
      if (previous === undefined) delete rows[id];
      else if (rows[id] === written) rows[id] = previous;
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
      const before = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
      // Screens offer changes only once the store is loaded; the first load is never cancelled.
      if (!before) return { changes: [] };
      // A poll already on its way would bring back the old rows.
      await queryClient.cancelQueries({ queryKey: SYNC_QUERY_KEY });
      queryClient.setQueryData(SYNC_QUERY_KEY, mutation.apply(before, variables));
      // Compared with what the cache holds now: structural sharing copies changed rows.
      const after = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY) ?? before;
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
