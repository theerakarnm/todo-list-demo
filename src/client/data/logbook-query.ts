import { infiniteQueryOptions } from "@tanstack/react-query";
import { api } from "../api/client";
import { request } from "../api/request";

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
