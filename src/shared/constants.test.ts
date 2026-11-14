import { describe, expect, it } from "vitest";
import { LIMITS, PRIORITIES, PRIORITY_BADGES, PROJECT_COLOR_HEX, PROJECT_COLORS } from "./constants";

describe("shared constants", () => {
  it("keeps the account limits from the architecture doc", () => {
    expect(LIMITS.activeTasksPerUser).toBe(1000);
    expect(LIMITS.projectsPerUser).toBe(100);
    expect(LIMITS.subtasksPerTask).toBe(50);
    expect(LIMITS.taskTitleLength).toBe(500);
    expect(LIMITS.taskNotesLength).toBe(10_000);
    expect(LIMITS.projectNameLength).toBe(50);
  });

  it("maps every priority to its badge, high = P1 and none = P4", () => {
    expect(PRIORITIES).toEqual(["none", "low", "medium", "high"]);
    expect(PRIORITY_BADGES).toEqual({ high: "P1", medium: "P2", low: "P3", none: "P4" });
  });

  it("has a design-token hex colour for every project colour", () => {
    for (const color of PROJECT_COLORS) {
      expect(PROJECT_COLOR_HEX[color]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
