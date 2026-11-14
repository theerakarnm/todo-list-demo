import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aProject, aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { apiError, stubApi } from "../test/fake-api";
import { renderWithStore } from "../test/render";
import TodayPage from "./TodayPage";

const groupOf = (heading: string) => screen.getByRole("heading", { name: heading }).parentElement?.nextElementSibling;

describe("TodayPage", () => {
  beforeEach(() => {
    // 23:30 on Saturday 14 Nov in Bangkok, still the 14th in UTC as well.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 14, 16, 30));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("groups overdue and today's tasks and counts what is left", () => {
    renderWithStore(
      <TodayPage />,
      storeWith({
        projects: [aProject({ id: "p1", name: "งาน" })],
        tasks: [
          aTask({ id: "old", title: "เตรียมสไลด์เดโม", dueDate: "2026-11-13", projectId: "p1", priority: "high" }),
          aTask({ id: "now", title: "ส่งใบเสนอราคาให้ลูกค้า", dueDate: "2026-11-14", dueTime: "10:00" }),
          aTask({ id: "later", title: "ซักผ้าห่ม", dueDate: "2026-11-15" }),
        ],
      }),
    );

    expect(screen.getByText("01 - วันนี้ / today - เสาร์ 14 พ.ย.")).toBeTruthy();
    expect(screen.getByRole("img", { name: "เหลือ 2 งาน" }).textContent).toContain("02");
    const overdue = within(groupOf("▲ เลยกำหนด / overdue - 1") as HTMLElement);
    expect(overdue.getByRole("link", { name: "เตรียมสไลด์เดโม" })).toBeTruthy();
    expect(overdue.getByText("▲ 13 พ.ย.")).toBeTruthy();
    expect(overdue.getByText("P1")).toBeTruthy();
    const today = within(groupOf("วันนี้ / today - 1") as HTMLElement);
    expect(today.getByRole("link", { name: "ส่งใบเสนอราคาให้ลูกค้า" })).toBeTruthy();
    expect(today.getByText("10:00")).toBeTruthy();
    expect(screen.queryByText("ซักผ้าห่ม")).toBeNull();
  });

  it("shows the all-clear state when nothing is due", () => {
    renderWithStore(<TodayPage />, storeWith({}));

    expect(screen.getByRole("heading", { name: th.pages.today.emptyTitle })).toBeTruthy();
  });

  it("completes a task with an Undo toast, and Undo sends the reverse call", async () => {
    let version = 1;
    const calls = stubApi({
      "PATCH /api/tasks/:id": async (request) => {
        const { completed } = (await request.json()) as { completed: boolean };
        return aTask({ id: "t1", title: "จ่ายค่าไฟ", dueDate: "2026-11-14", completedAt: completed ? 5 : null, updatedAt: ++version });
      },
    });
    renderWithStore(<TodayPage />, storeWith({ tasks: [aTask({ id: "t1", title: "จ่ายค่าไฟ", dueDate: "2026-11-14" })] }));

    fireEvent.click(screen.getByRole("button", { name: "ทำเครื่องหมายว่าเสร็จ: จ่ายค่าไฟ" }));

    expect(await screen.findByRole("heading", { name: th.pages.today.emptyTitle })).toBeTruthy();
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: th.toast.undo }));
    expect(await screen.findByRole("link", { name: "จ่ายค่าไฟ" })).toBeTruthy();
    await waitFor(() => expect(calls.map((call) => call.body)).toEqual([{ completed: true }, { completed: false }]));
  });

  it("puts the task back and explains in Thai when the server rejects the change", async () => {
    stubApi({ "PATCH /api/tasks/:id": () => apiError("NOT_FOUND", 404) });
    renderWithStore(<TodayPage />, storeWith({ tasks: [aTask({ id: "t1", title: "จ่ายค่าไฟ", dueDate: "2026-11-14" })] }));

    fireEvent.click(screen.getByRole("button", { name: "ทำเครื่องหมายว่าเสร็จ: จ่ายค่าไฟ" }));

    expect(await screen.findByText(th.errors.api.NOT_FOUND)).toBeTruthy();
    expect(screen.getByRole("link", { name: "จ่ายค่าไฟ" })).toBeTruthy();
  });

  it("reschedules every overdue task to today", async () => {
    const calls = stubApi({
      "POST /api/tasks/reschedule-overdue": () => ({ today: "2026-11-14", tasks: [{ id: "t1", dueDate: "2026-11-10" }] }),
    });
    renderWithStore(<TodayPage />, storeWith({ tasks: [aTask({ id: "t1", title: "คืนหนังสือ", dueDate: "2026-11-10" })] }));

    fireEvent.click(screen.getByRole("button", { name: th.pages.today.rescheduleLabel }));

    expect(await screen.findByRole("heading", { name: "วันนี้ / today - 1" })).toBeTruthy();
    expect(screen.queryByText(/เลยกำหนด/)).toBeNull();
    expect(screen.getByText("ย้าย 1 งานมาเป็นวันนี้แล้ว")).toBeTruthy();
    await waitFor(() => expect(calls).toHaveLength(1));
  });

  it("adds a task due today inline", async () => {
    const calls = stubApi({ "PUT /api/tasks/:id": async (request) => ({ ...(await request.json()), updatedAt: 0 }) });
    renderWithStore(<TodayPage />, storeWith({}));

    fireEvent.click(screen.getByRole("button", { name: new RegExp(th.task.addTask) }));
    const input = screen.getByRole("textbox", { name: th.task.addTask });
    fireEvent.change(input, { target: { value: "ต่อประกันรถ" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByRole("link", { name: "ต่อประกันรถ" })).toBeTruthy();
    await waitFor(() => expect(calls[0]?.body).toMatchObject({ dueDate: "2026-11-14", projectId: null }));
  });
});
