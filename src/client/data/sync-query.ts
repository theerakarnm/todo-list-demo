import { type QueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { request } from "../api/request";
import { mergeSync, type SyncStore } from "./sync-store";

export const SYNC_QUERY_KEY = ["sync"] as const;

/** Another device's changes show up within this time while the tab is visible (ARCHITECTURE §6). */
const POLL_INTERVAL_MS = 30_000;

async function fetchSync(queryClient: QueryClient): Promise<SyncStore> {
  const store = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
  // While a change is on its way to the server, a poll could bring back the old row
  // and undo the optimistic update on screen, so polling waits for it.
  if (store && queryClient.isMutating() > 0) return store;

  const response = await request(api.api.sync.$get({ query: store ? { since: store.cursor } : {} }));
  return mergeSync(queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY), response);
}

export const syncQuery = queryOptions({
  queryKey: SYNC_QUERY_KEY,
  queryFn: ({ client }) => fetchSync(client),
  // Polls only while the tab is visible, and again as soon as it regains focus.
  refetchInterval: POLL_INTERVAL_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: "always",
});

/** The normalized store, or undefined until the first load arrives. */
export function useSyncStore() {
  return useQuery(syncQuery).data;
}
