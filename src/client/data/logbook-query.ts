import { infiniteQueryOptions, type QueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { request } from "../api/request";
import { SYNC_QUERY_KEY } from "./sync-query";
import { applyRows, type ChangedRows, type SyncStore } from "./sync-store";

/** Every Logbook query starts with this key; invalidate it when a task is completed or un-completed. */
export const LOGBOOK_QUERY_KEY = ["logbook"] as const;

type PageCursor = { before?: number; beforeId?: string };

/**
 * Completed tasks also go into the sync store, with their subtasks, so the
 * TaskDrawer and the "2/5" progress work for them like for any task.
 * Not while a change is on its way: an older copy would undo it on screen.
 */
function addToStore(queryClient: QueryClient, rows: ChangedRows) {
  if (queryClient.isMutating() > 0) return;
  queryClient.setQueryData<SyncStore>(SYNC_QUERY_KEY, (store) => store && applyRows(store, rows));
}

/** Completed tasks, newest first, 50 a page. With a project id: only that project's. */
export function logbookQuery(projectId?: string) {
  return infiniteQueryOptions({
    queryKey: [...LOGBOOK_QUERY_KEY, projectId ?? "all"],
    queryFn: async ({ pageParam, client }) => {
      const page = await request(api.api.logbook.$get({ query: { ...pageParam, projectId } }));
      addToStore(client, page);
      return page;
    },
    initialPageParam: {} as PageCursor,
    getNextPageParam: (page): PageCursor | undefined => page.next ?? undefined,
  });
}
