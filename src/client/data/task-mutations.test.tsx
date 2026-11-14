import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import th from "../i18n/th.json";
import { apiError, stubApi } from "../test/fake-api";
import { renderHookWithStore } from "../test/render";
import { SYNC_QUERY_KEY } from "./sync-query";
import type { SyncStore } from "./sync-store";
import { useCompleteTask, useCreateTask, useDeleteTask, useRescheduleOverdue } from "./task-mutations";
import { aSubtask, aTask, storeWith } from "./test-rows";

const storeIn = (queryClient: { getQueryData: (key: typeof SYNC_QUERY_KEY) => unknown }) =>
  queryClient.getQueryData(SYNC_QUERY_KEY) as SyncStore;

const clickUndo = () => fireEvent.click(screen.getByRole("button", { name: th.toast.undo }));

describe("task mutations", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("complete: ticks at once, sends it, and Undo sends the reverse", async () => {
    let version = 1;
    const calls = stubApi({
      "PATCH /api/tasks/:id": async (request) => {
        const { completed } = (await request.json()) as { completed: boolean };
        return aTask({ id: "t1", completedAt: completed ? 5 : null, updatedAt: ++version });
      },
    });
    const task = aTask({ id: "t1", title: "จ่ายค่าไฟ" });
    const { result, queryClient } = renderHookWithStore(useCompleteTask, storeWith({ tasks: [task] }));

    act(() => result.current(task));

    await waitFor(() => expect(storeIn(queryClient).tasks.t1?.completedAt).not.toBeNull());
    expect(screen.getByText("ทำเสร็จแล้ว: จ่ายค่าไฟ")).toBeTruthy();
    clickUndo();
    await waitFor(() => expect(calls.map((call) => call.body)).toEqual([{ completed: true }, { completed: false }]));
    expect(storeIn(queryClient).tasks.t1?.completedAt).toBeNull();
  });

  it("delete: removes the task and its subtasks, and Undo restores both", async () => {
    const calls = stubApi({
      "DELETE /api/tasks/:id": () => aTask({ id: "t1", deletedAt: 5, updatedAt: 5 }),
      "POST /api/tasks/:id/restore": () => aTask({ id: "t1", updatedAt: 6 }),
    });
    const task = aTask({ id: "t1" });
    const { result, queryClient } = renderHookWithStore(
      useDeleteTask,
      storeWith({ tasks: [task], subtasks: [aSubtask({ id: "s1", taskId: "t1" })] }),
    );

    act(() => result.current(task));
    await waitFor(() => expect(storeIn(queryClient).tasks.t1).toBeUndefined());
    expect(storeIn(queryClient).subtasks.s1).toBeUndefined();

    clickUndo();
    await waitFor(() => expect(calls.map((call) => `${call.method} ${call.path}`)).toHaveLength(2));
    expect(calls[1]?.path).toBe("/api/tasks/t1/restore");
    expect(storeIn(queryClient).tasks.t1).toBeDefined();
    expect(storeIn(queryClient).subtasks.s1).toBeDefined();
  });

  it("reschedule overdue: moves them to today, and Undo sends back the server's list", async () => {
    const previous = [{ id: "t1", dueDate: "2026-11-10" }];
    const calls = stubApi({
      "POST /api/tasks/reschedule-overdue": () => ({ today: "2026-11-14", tasks: previous }),
      "POST /api/tasks/reschedule-overdue/undo": () => ({ tasks: previous }),
    });
    const overdue = aTask({ id: "t1", dueDate: "2026-11-10" });
    const { result, queryClient } = renderHookWithStore(useRescheduleOverdue, storeWith({ tasks: [overdue] }));

    act(() => result.current([overdue], "2026-11-14"));
    await waitFor(() => expect(storeIn(queryClient).tasks.t1?.dueDate).toBe("2026-11-14"));

    clickUndo();
    await waitFor(() => expect(calls[1]?.body).toEqual({ tasks: previous }));
    expect(storeIn(queryClient).tasks.t1?.dueDate).toBe("2026-11-10");
  });

  it("create: takes the task back off the list when the account is full", async () => {
    stubApi({ "PUT /api/tasks/:id": () => apiError("TASK_LIMIT", 409) });
    const { result, queryClient } = renderHookWithStore(useCreateTask, storeWith({}));

    act(() => result.current({ title: "งานที่ 1,001", projectId: null, dueDate: null }));

    expect(await screen.findByText(/มีงานที่ยังไม่เสร็จครบ 1,000 งานแล้ว/)).toBeTruthy();
    expect(storeIn(queryClient).tasks).toEqual({});
  });
});
