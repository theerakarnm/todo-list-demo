import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { request } from "../api/request";
import { apiError, stubApi } from "../test/fake-api";
import { renderHookWithStore, storeWith } from "../test/render";
import { useOptimisticMutation } from "./optimistic";
import { useCreateTask } from "./task-mutations";
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
    answer(apiError(409, "TASK_LIMIT"));

    expect(await screen.findByText("มีงานที่ยังไม่เสร็จครบ 1,000 งานแล้ว กรุณาปิดหรือลบงานเก่าก่อน")).toBeTruthy();
    expect(tasksIn(queryClient).t1?.title).toBe("เดิม");
    expect(tasksIn(queryClient).t2?.title).toBe("แก้แล้ว");
  });

  it("shows every change made at once, not only the last one", async () => {
    stubApi({ "PUT /api/tasks/:id": () => new Promise<Response>(() => {}) });
    const { result, queryClient } = renderHookWithStore(useCreateTask, storeWith({}));

    act(() => {
      result.current({ title: "ซื้อนม", projectId: null, dueDate: null });
      result.current({ title: "ซื้อไข่", projectId: null, dueDate: null });
    });

    await waitFor(() =>
      expect(Object.values(tasksIn(queryClient)).map((task) => task.title)).toEqual(["ซื้อนม", "ซื้อไข่"]),
    );
  });

  it("leaves no ghost row when a create fails and a queued edit of it then fails too", async () => {
    let answerCreate: (response: Response) => void = () => {};
    stubApi({
      "PUT /api/tasks/:id": () => new Promise<Response>((resolve) => (answerCreate = resolve)),
      "PATCH /api/tasks/:id": () => apiError(404, "NOT_FOUND"),
    });
    const { result, queryClient } = renderHookWithStore(
      () => ({ create: useCreateTask(), rename: useRename() }),
      storeWith({}),
    );

    act(() => result.current.create({ title: "ใหม่", projectId: null, dueDate: null }));
    await waitFor(() => expect(Object.keys(tasksIn(queryClient))).toHaveLength(1));
    const id = Object.keys(tasksIn(queryClient))[0] ?? "";
    act(() => result.current.rename.mutate({ id, title: "แก้ชื่อ" }));
    await waitFor(() => expect(tasksIn(queryClient)[id]?.title).toBe("แก้ชื่อ"));
    answerCreate(apiError(409, "TASK_LIMIT"));

    await waitFor(() => expect(screen.getAllByText(/./, { selector: ".toast span" })).toHaveLength(2));
    expect(tasksIn(queryClient)).toEqual({});
  });
});
