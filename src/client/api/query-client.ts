import { QueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "./request-error";

/** The server said no (4xx): asking again gives the same answer. Network and 5xx errors are retried. */
function shouldRetry(failureCount: number, error: Error) {
  if (error instanceof ApiRequestError && error.status < 500) return false;
  return failureCount < 3;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Coming back to the tab refetches, so other devices' changes show up (ARCHITECTURE §6).
      refetchOnWindowFocus: true,
      retry: shouldRetry,
    },
  },
});
