import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import "../i18n";
import { SYNC_QUERY_KEY } from "../data/sync-query";
import type { SyncStore } from "../data/sync-store";
import { ToastProvider } from "../toast/ToastProvider";

export { storeWith } from "../data/test-rows";

/** A query client whose sync store is already loaded, so no test waits for /api/sync. */
export function queryClientWith(store: SyncStore) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(SYNC_QUERY_KEY, store);
  return queryClient;
}

function Providers({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

/** Renders `ui` inside a router at `path`, with the data and toast providers. */
export function renderWithStore(ui: ReactNode, store: SyncStore, path = "/app/today") {
  const queryClient = queryClientWith(store);
  const router = createMemoryRouter([{ path: "*", element: ui }], { initialEntries: [path] });
  const result = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...result, queryClient, router };
}

export function renderHookWithStore<Result>(hook: () => Result, store: SyncStore) {
  const queryClient = queryClientWith(store);
  const result = renderHook(hook, {
    wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
  });
  return { ...result, queryClient };
}
