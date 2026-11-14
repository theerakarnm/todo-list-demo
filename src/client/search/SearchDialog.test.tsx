import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SYNC_QUERY_KEY } from "../data/sync-query";
import type { SyncStore } from "../data/sync-store";
import { aProject, aSubtask, aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { stubApi } from "../test/fake-api";
import { renderWithStore } from "../test/render";
import { SearchDialog } from "./SearchDialog";

const work = aProject({ id: "p-work", name: "งาน" });
const sendWork = aTask({ id: "t-send", title: "ส่งงานให้ลูกค้า", projectId: work.id, dueDate: "2026-11-20" });
const doneTask = aTask({ id: "t-done", title: "งานเก่า", completedAt: 5 });
const doneSubtask = aSubtask({ id: "s-done", taskId: doneTask.id });

function renderSearch() {
  const calls = stubApi({
    "GET /api/search": () => ({ tasks: [sendWork, doneTask], projects: [work], subtasks: [doneSubtask] }),
  });
  const onClose = vi.fn();
  const store = storeWith({ tasks: [sendWork], projects: [work] });
  const rendered = renderWithStore(<SearchDialog onClose={onClose} />, store, "/app/today");
  const input = screen.getByRole("combobox", { name: th.nav.search });
  fireEvent.change(input, { target: { value: "งาน" } });
  return { ...rendered, calls, onClose, input };
}

describe("SearchDialog", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("groups tasks and projects and marks the matched text", async () => {
    const { calls } = renderSearch();

    const tasks = await screen.findByRole("group", { name: "tasks - 2" });
    const projects = screen.getByRole("group", { name: "projects - 1" });

    expect(calls.at(-1)?.search.get("q")).toBe("งาน");
    expect(within(tasks).getAllByRole("option")).toHaveLength(2);
    expect(within(tasks).getAllByRole("option")[0]?.textContent).toContain("งาน - ศ 20 พ.ย.");
    expect(within(tasks).getAllByRole("option")[0]?.querySelector("mark")?.textContent).toBe("งาน");
    expect(within(projects).getByRole("option").textContent).toContain("1 งาน");
  });

  it("waits for the typing to stop before it searches", async () => {
    const { calls, input } = renderSearch();
    fireEvent.change(input, { target: { value: "งานด" } });
    fireEvent.change(input, { target: { value: "งานด่วน" } });

    await waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]?.search.get("q")).toBe("งานด่วน");
  });

  it("moves with the arrow keys and opens a project with Enter", async () => {
    const { input, router, onClose } = renderSearch();
    await screen.findByRole("group", { name: "projects - 1" });

    expect(screen.getAllByRole("option")[0]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[2]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(router.state.location.pathname).toBe("/app/projects/p-work");
    expect(onClose).toHaveBeenCalled();
  });

  it("opens a completed task in the TaskDrawer, with its subtasks in the store", async () => {
    const { input, router, queryClient } = renderSearch();
    await screen.findByRole("group", { name: "tasks - 2" });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(router.state.location.pathname).toBe("/app/today");
    expect(router.state.location.search).toBe("?task=t-done");
    const store = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
    expect(store?.tasks[doneTask.id]).toBeTruthy();
    expect(store?.subtasks[doneSubtask.id]).toBeTruthy();
  });

  it("says so when nothing matches", async () => {
    stubApi({ "GET /api/search": () => ({ tasks: [], projects: [], subtasks: [] }) });
    renderWithStore(<SearchDialog onClose={vi.fn()} />, storeWith({}), "/app/today");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ไม่มี" } });

    expect(await screen.findByText(th.search.noResults.replace("{{query}}", "ไม่มี"))).toBeTruthy();
  });
});
