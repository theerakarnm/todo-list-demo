import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { request } from "../api/request";
import { apiError, stubApi } from "../test/fake-api";
import { renderHookWithStore, storeWith } from "../test/render";
import { useOptimisticMutation } from "./optimistic";
import { SYNC_QUERY_KEY } from "./sync-query";
import type { SyncStore } from "./sync-store";
import { aTask } from "./test-rows";

function useRename() {
  return useOptimisticMutation({
    request: ({ id, title }: { id: string; title: string }) =>
      request(api.api.tasks[":id"].$patch({ param: { id }, json: { title } })),
    apply: (store, { id, title }) => {
      const task = store.tasks[id];
      return task ? { ...store, tasks: { ...store.tasks, [id]: { ...task, title } } } : store;
    },
    confirm: (task) => ({ tasks: [task] }),
  });
}

function tasksIn(queryClient: { getQueryData: (key: typeof SYNC_QUERY_KEY) => unknown }) {
  return (queryClient.getQueryData(SYNC_QUERY_KEY) as SyncStore).tasks;
}

describe("useOptimisticMutation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("changes the store before the server answers, then keeps the server's row", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi({ "PATCH /api/tasks/:id": () => new Promise<Response>((resolve) => (answer = resolve)) });
    const { result, queryClient } = renderHookWithStore(useRename, storeWith({ tasks: [aTask({ id: "t1" })] }));

    act(() => result.current.mutate({ id: "t1", title: "ใหม่" }));

    await waitFor(() => expect(tasksIn(queryClient).t1?.title).toBe("ใหม่"));
    answer(Response.json(aTask({ id: "t1", title: "ใหม่", updatedAt: 50 })));
    await waitFor(() => expect(tasksIn(queryClient).t1?.updatedAt).toBe(50));
  });

  it("rolls back only its own rows and shows the Thai error when the server says no", async () => {
    let answer: (response: Response) => void = () => {};
    stubApi({ "PATCH /api/tasks/:id": () => new Promise<Response>((resolve) => (answer = resolve)) });
    const { result, queryClient } = renderHookWithStore(
      useRename,
      storeWith({ tasks: [aTask({ id: "t1", title: "เดิม" }), aTask({ id: "t2", title: "อื่น" })] }),
    );

    act(() => result.current.mutate({ id: "t1", title: "ใหม่" }));
    await waitFor(() => expect(tasksIn(queryClient).t1?.title).toBe("ใหม่"));
    // Another change lands while the first is still on its way.
    act(() => {
      const store = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY) as SyncStore;
      queryClient.setQueryData(SYNC_QUERY_KEY, { ...store, tasks: { ...store.tasks, t2: aTask({ id: "t2", title: "แก้แล้ว" }) } });
    });
    answer(apiError("TASK_LIMIT", 409));

    expect(await screen.findByText("มีงานที่ยังไม่เสร็จครบ 1,000 งานแล้ว กรุณาปิดหรือลบงานเก่าก่อน")).toBeTruthy();
    expect(tasksIn(queryClient).t1?.title).toBe("เดิม");
    expect(tasksIn(queryClient).t2?.title).toBe("แก้แล้ว");
  });
});
