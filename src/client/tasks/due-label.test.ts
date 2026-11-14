import { describe, expect, it } from "vitest";
import { aTask } from "../data/test-rows";
import { dueLabelFor } from "./due-label";

const today = "2026-11-14";

describe("dueLabelFor", () => {
  it("shows overdue dates with a ▲ in every list", () => {
    const task = aTask({ id: "t", dueDate: "2026-11-13", dueTime: "10:00" });

    expect(dueLabelFor(task, today, "time")).toEqual({ kind: "overdue", date: "2026-11-13", time: null });
    expect(dueLabelFor(task, today, "full")?.kind).toBe("overdue");
  });

  it("shows only the time in lists grouped by day", () => {
    expect(dueLabelFor(aTask({ id: "t", dueDate: today, dueTime: "10:00" }), today, "time")).toEqual({
      kind: "time",
      time: "10:00",
    });
    expect(dueLabelFor(aTask({ id: "t", dueDate: today }), today, "time")).toBeNull();
  });

  it("names today and tomorrow, and dates further out", () => {
    const label = (dueDate: string) => dueLabelFor(aTask({ id: "t", dueDate }), today, "full")?.date;

    expect([label(today), label("2026-11-15"), label("2026-11-16")]).toEqual(["today", "tomorrow", "2026-11-16"]);
  });

  it("shows nothing without a due date", () => {
    expect(dueLabelFor(aTask({ id: "t" }), today, "full")).toBeNull();
  });
});
