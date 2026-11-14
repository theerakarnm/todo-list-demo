import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../test/fake-api";
import { syncQuery, useSyncPolling, useSyncStore } from "./sync-query";
import { aTask } from "./test-rows";

const settings = { timezone: "Asia/Bangkok", weekStart: "mon" };

function ScreenUsingTheStore() {
  useSyncStore();
  return null;
}

function Shell({ screens }: { screens: number }) {
  useSyncPolling();
  const names = ["today", "sidebar", "drawer", "project"].slice(0, screens);
  return names.map((name) => <ScreenUsingTheStore key={name} />);
}

describe("syncQuery", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("polls once every 30 seconds however many screens read the store", async () => {
    vi.useFakeTimers();
    const calls = stubApi({
      "GET /api/sync": () => ({ tasks: [], projects: [], subtasks: [], settings, cursor: 100 }),
    });
    const queryClient = new QueryClient();
    const withScreens = (screens: number) => (
      <QueryClientProvider client={queryClient}>
        <Shell screens={screens} />
      </QueryClientProvider>
    );
    const { rerender } = render(withScreens(1));
    await act(() => vi.advanceTimersByTimeAsync(10_000));

    // Screens opened later neither sync on opening nor start timers of their own.
    rerender(withScreens(4));
    await act(() => vi.advanceTimersByTimeAsync(21_000));

    expect(calls).toHaveLength(2);
  });

  it("loads everything first, then asks only for changes since the cursor", async () => {
    const calls = stubApi({
      "GET /api/sync": (request) =>
        new URL(request.url).searchParams.has("since")
          ? { tasks: [aTask({ id: "t2" })], projects: [], subtasks: [], settings, cursor: 200 }
          : { tasks: [aTask({ id: "t1" })], projects: [], subtasks: [], settings, cursor: 100 },
    });
    const queryClient = new QueryClient();

    await queryClient.fetchQuery(syncQuery);
    const store = await queryClient.fetchQuery({ ...syncQuery, staleTime: 0 });

    expect(calls.map((call) => call.search.get("since"))).toEqual([null, "100"]);
    expect(Object.keys(store.tasks)).toEqual(["t1", "t2"]);
    expect(store.cursor).toBe(200);
  });

  it("does not poll while a change is still on its way to the server", async () => {
    const calls = stubApi({
      "GET /api/sync": () => ({ tasks: [], projects: [], subtasks: [], settings, cursor: 100 }),
    });
    const queryClient = new QueryClient();
    await queryClient.fetchQuery(syncQuery);

    const pending = queryClient.getMutationCache().build(queryClient, { mutationFn: () => new Promise(() => {}) });
    void pending.execute(undefined);
    await queryClient.fetchQuery({ ...syncQuery, staleTime: 0 });

    expect(calls).toHaveLength(1);
  });
});
