import { describe, expect, it } from "vitest";
import { planMove } from "./plan-move";

const rows = [
  { id: "a", position: "a0" },
  { id: "b", position: "a1" },
  { id: "c", position: "a2" },
];

describe("planMove", () => {
  it("gives the dragged row a position between its new neighbours", () => {
    const move = planMove(rows, "c", "a");

    expect(move?.row.id).toBe("c");
    expect(move && move.position < "a0").toBe(true);
  });

  it("moves a row down past the one it is dropped on", () => {
    const move = planMove(rows, "a", "b");

    expect(move && move.position > "a1" && move.position < "a2").toBe(true);
  });

  it.each([
    ["dropped on itself", "b", "b"],
    ["dropped outside the list", "b", undefined],
    ["an unknown row", "x", "a"],
  ])("does nothing for %s", (_case, activeId, overId) => {
    expect(planMove(rows, activeId, overId)).toBeNull();
  });
});
