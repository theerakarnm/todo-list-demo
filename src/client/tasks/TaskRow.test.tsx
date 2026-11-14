import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import "../i18n";
import { aProject, aTask } from "../data/test-rows";
import { TaskRow } from "./TaskRow";

function renderRow(
  fields: Parameters<typeof aTask>[0],
  dateStyle: "full" | "time" = "full",
  path = "/",
  imageCount?: number,
) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <TaskRow
        task={aTask(fields)}
        project={aProject({ id: "p1", name: "งาน" })}
        progress={{ done: 2, total: 5 }}
        imageCount={imageCount}
        dateStyle={dateStyle}
        today="2026-11-14"
        onToggle={() => {}}
      />
    </MemoryRouter>,
  );
}

describe("TaskRow", () => {
  it("shows the project, subtask progress, date and priority", () => {
    renderRow({ id: "t1", title: "ส่งใบเสนอราคา", dueDate: "2026-11-14", dueTime: "10:00", priority: "high" });

    expect(screen.getByRole("link", { name: "ส่งใบเสนอราคา" }).getAttribute("href")).toBe("/?task=t1");
    expect(screen.getByText("งาน")).toBeTruthy();
    expect(screen.getByText("2/5")).toBeTruthy();
    expect(screen.getByText("วันนี้ 10:00")).toBeTruthy();
    expect(screen.getByText("P1")).toBeTruthy();
  });

  it.each([
    ["2026-11-15", "พรุ่งนี้"],
    ["2026-11-20", "20 พ.ย."],
  ])("writes %s as %s", (dueDate, text) => {
    renderRow({ id: "t1", dueDate });

    expect(screen.getByText(text)).toBeTruthy();
  });

  it("opens the drawer without losing the page's own query", () => {
    renderRow({ id: "t1", title: "จ่ายค่าไฟ" }, "full", "/app/logbook?project=p1");

    expect(screen.getByRole("link", { name: "จ่ายค่าไฟ" }).getAttribute("href")).toBe("/app/logbook?project=p1&task=t1");
  });

  it("shows 📎 and the number of images, named for screen readers", () => {
    renderRow({ id: "t1" }, "full", "/", 3);

    expect(screen.getByText("📎 3")).toBeTruthy();
    expect(screen.getByText("รูปภาพ 3 รูป").className).toContain("sr-only");
  });

  it("shows no 📎 for a task without images", () => {
    renderRow({ id: "t1" });

    expect(screen.queryByText(/📎/)).toBeNull();
  });

  it("shows a muted P4 when there is no priority", () => {
    renderRow({ id: "t1" });

    expect(screen.getByText("P4").className).toContain("priority-none");
  });
});
