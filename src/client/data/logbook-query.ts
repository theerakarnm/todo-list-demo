import { type InfiniteData, infiniteQueryOptions, type QueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { request } from "../api/request";
import type { Task } from "./types";

/** Every Logbook query starts with this key; invalidate it when a task is completed or un-completed. */
export const LOGBOOK_QUERY_KEY = ["logbook"] as const;

type PageCursor = { before?: number; beforeId?: string };

/** Completed tasks, newest first, 50 a page. With a project id: only that project's. */
export function logbookQuery(projectId?: string) {
  return infiniteQueryOptions({
    queryKey: [...LOGBOOK_QUERY_KEY, projectId ?? "all"],
    queryFn: ({ pageParam }) => request(api.api.logbook.$get({ query: { ...pageParam, projectId } })),
    initialPageParam: {} as PageCursor,
    getNextPageParam: (page): PageCursor | undefined => page.next ?? undefined,
  });
}

type LogbookPage = { tasks: Task[] };

/** A completed task from a Logbook page already loaded, e.g. to open it in the TaskDrawer. */
export function findInLogbook(queryClient: QueryClient, id: string) {
  for (const [, data] of queryClient.getQueriesData<InfiniteData<LogbookPage>>({ queryKey: LOGBOOK_QUERY_KEY })) {
    const task = data?.pages.flatMap((page) => page.tasks).find((candidate) => candidate.id === id);
    if (task) return task;
  }
  return undefined;
}
