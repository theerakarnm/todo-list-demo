import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aProject, aSubtask, aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { echoCreatedRow, stubApi } from "../test/fake-api";
import { renderWithStore } from "../test/render";
import { TaskDrawer } from "./TaskDrawer";

function renderDrawer() {
  const store = storeWith({
    projects: [aProject({ id: "p1", name: "งาน" })],
    tasks: [aTask({ id: "t1", title: "ส่งใบเสนอราคาให้ลูกค้า", dueDate: "2026-11-14" })],
    subtasks: [aSubtask({ id: "s1", taskId: "t1", title: "ทำตัวเลข" })],
  });
  const result = renderWithStore(<TaskDrawer />, store, "/app/today?task=t1");
  return { ...result, drawer: within(screen.getByRole("dialog", { name: th.drawer.label })) };
}

describe("TaskDrawer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("edits the title, project and priority", async () => {
    const calls = stubApi({ "PATCH /api/tasks/:id": () => aTask({ id: "t1", updatedAt: 0 }) });
    const { drawer } = renderDrawer();

    const title = drawer.getByRole("textbox", { name: th.drawer.title });
    fireEvent.change(title, { target: { value: "ส่งใบเสนอราคา v2" } });
    fireEvent.blur(title);
    fireEvent.change(drawer.getByRole("combobox", { name: th.drawer.project }), { target: { value: "p1" } });
    fireEvent.click(drawer.getByRole("radio", { name: "P1" }));

    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[0]?.body).toEqual({ title: "ส่งใบเสนอราคา v2" });
    expect(calls[1]?.body).toMatchObject({ projectId: "p1" });
    expect(calls[2]?.body).toEqual({ priority: "high" });
  });

  it("adds, ticks and deletes subtasks", async () => {
    const calls = stubApi({
      "PUT /api/subtasks/:id": echoCreatedRow,
      "PATCH /api/subtasks/:id": () => aSubtask({ id: "s1", taskId: "t1", completedAt: 5, updatedAt: 0 }),
      "DELETE /api/subtasks/:id": () => aSubtask({ id: "s1", taskId: "t1", deletedAt: 5, updatedAt: 0 }),
    });
    const { drawer } = renderDrawer();

    const add = drawer.getByRole("textbox", { name: th.drawer.addSubtask });
    fireEvent.change(add, { target: { value: "โทรถามลูกค้า" } });
    fireEvent.keyDown(add, { key: "Enter" });
    expect(await drawer.findByText("งานย่อย / subtasks - 0/2")).toBeTruthy();

    fireEvent.click(drawer.getByRole("button", { name: "ทำเครื่องหมายว่าเสร็จ: ทำตัวเลข" }));
    expect(await drawer.findByText("งานย่อย / subtasks - 1/2")).toBeTruthy();

    fireEvent.click(drawer.getByRole("button", { name: "ลบงานย่อย: ทำตัวเลข" }));
    expect(await drawer.findByText("งานย่อย / subtasks - 0/1")).toBeTruthy();
    await waitFor(() => expect(calls.map((call) => call.method)).toEqual(["PUT", "PATCH", "DELETE"]));
    expect(calls[0]?.body).toMatchObject({ taskId: "t1", title: "โทรถามลูกค้า" });
  });

  it("deletes the task, closes, and offers Undo", async () => {
    const calls = stubApi({ "DELETE /api/tasks/:id": () => aTask({ id: "t1", deletedAt: 5, updatedAt: 5 }) });
    const { drawer, router } = renderDrawer();

    fireEvent.click(drawer.getByRole("button", { name: th.drawer.delete }));

    await waitFor(() => expect(router.state.location.search).toBe(""));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(screen.getByRole("status")).getByRole("button", { name: th.toast.undo })).toBeTruthy();
    await waitFor(() => expect(calls[0]?.method).toBe("DELETE"));
  });

  it("closes with Esc", async () => {
    const { router } = renderDrawer();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    await waitFor(() => expect(router.state.location.search).toBe(""));
  });
});
