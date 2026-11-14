import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncStore } from "../data/sync-store";
import { aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { QuickAddContext } from "../quick-add/quick-add-context";
import { renderWithStore } from "../test/render";
import UpcomingPage from "./UpcomingPage";

function renderUpcoming(store: SyncStore, openQuickAdd = vi.fn()) {
  return renderWithStore(
    <QuickAddContext value={openQuickAdd}>
      <UpcomingPage />
    </QuickAddContext>,
    store,
  );
}

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
    renderUpcoming(storeWith({ tasks: [aTask({ id: "t1", title: "ซักผ้าห่ม", dueDate: "2026-11-15" })] }));

    expect(dayHeadings()).toEqual([
      "พรุ่งนี้ - อาทิตย์ 15 พ.ย.",
      "จันทร์ 16 พ.ย.",
      "อังคาร 17 พ.ย.",
      "พุธ 18 พ.ย.",
      "พฤหัสบดี 19 พ.ย.",
      "ศุกร์ 20 พ.ย.",
      "เสาร์ 21 พ.ย.",
    ]);
    expect(screen.getByRole("region", { name: /^พรุ่งนี้/ }).textContent).toContain("ซักผ้าห่ม");
    expect(screen.getByText("1 งาน")).toBeTruthy();
    expect(screen.getAllByText(th.pages.upcoming.free)).toHaveLength(6);
    expect(screen.getByRole("img", { name: th.pages.upcoming.loadLabel })).toBeTruthy();
  });

  it("remembers the chosen range on this device", () => {
    renderUpcoming(storeWith({}));

    fireEvent.click(screen.getByRole("radio", { name: "30 วัน" }));

    expect(dayHeadings()).toHaveLength(30);
    expect(localStorage.getItem("jotlist-upcoming-range")).toBe("30");
  });

  it("opens Quick Add on that day from its Add task button", () => {
    const openQuickAdd = vi.fn();
    renderUpcoming(storeWith({}), openQuickAdd);

    fireEvent.click(screen.getByRole("button", { name: "เพิ่มงานวันจันทร์ 16 พ.ย." }));

    expect(openQuickAdd).toHaveBeenCalledWith({ dueDate: "2026-11-16" });
  });
});
