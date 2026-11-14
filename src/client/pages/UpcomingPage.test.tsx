import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { stubApi } from "../test/fake-api";
import { renderWithStore } from "../test/render";
import UpcomingPage from "./UpcomingPage";

const dayHeadings = () => screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

describe("UpcomingPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 14, 3, 0)); // Saturday 14 Nov in Bangkok
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("shows a section per day from tomorrow, with counts and free days", () => {
    renderWithStore(
      <UpcomingPage />,
      storeWith({ tasks: [aTask({ id: "t1", title: "ซักผ้าห่ม", dueDate: "2026-11-15" })] }),
    );

    expect(dayHeadings()).toEqual([
      "พรุ่งนี้ - อาทิตย์ 15 พ.ย.",
      "จันทร์ 16 พ.ย.",
      "อังคาร 17 พ.ย.",
      "พุธ 18 พ.ย.",
      "พฤหัสบดี 19 พ.ย.",
      "ศุกร์ 20 พ.ย.",
      "เสาร์ 21 พ.ย.",
    ]);
    expect(screen.getByText("1 งาน")).toBeTruthy();
    expect(screen.getAllByText(th.pages.upcoming.free)).toHaveLength(6);
    expect(screen.getByRole("img", { name: th.pages.upcoming.loadLabel })).toBeTruthy();
  });

  it("remembers the chosen range on this device", () => {
    renderWithStore(<UpcomingPage />, storeWith({}));

    fireEvent.click(screen.getByRole("radio", { name: "30 วัน" }));

    expect(dayHeadings()).toHaveLength(30);
    expect(localStorage.getItem("jotlist-upcoming-range")).toBe("30");
  });

  it("adds a task to that day from its Add task button", async () => {
    const calls = stubApi({ "PUT /api/tasks/:id": async (request) => ({ ...(await request.json()), updatedAt: 0 }) });
    renderWithStore(<UpcomingPage />, storeWith({}));

    fireEvent.click(screen.getByRole("button", { name: "เพิ่มงานวันจันทร์ 16 พ.ย." }));
    const input = screen.getByRole("textbox", { name: th.task.addTask });
    fireEvent.change(input, { target: { value: "จองตั๋วรถไฟกลับบ้าน" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByRole("link", { name: "จองตั๋วรถไฟกลับบ้าน" })).toBeTruthy();
    await waitFor(() => expect(calls[0]?.body).toMatchObject({ dueDate: "2026-11-16" }));
  });
});
