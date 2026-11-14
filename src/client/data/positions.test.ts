import { describe, expect, it } from "vitest";
import { positionAtEnd, positionForMove } from "./positions";

const rows = (...positions: string[]) => positions.map((position) => ({ position }));

describe("positionForMove", () => {
  it("puts a row moved down after its new upper neighbour", () => {
    const position = positionForMove(rows("a0", "a1", "a2"), 0, 2);

    expect(position > "a2").toBe(true);
  });

  it("puts a row moved up before the first row", () => {
    const position = positionForMove(rows("a0", "a1", "a2"), 2, 0);

    expect(position < "a0").toBe(true);
  });

  it("puts a row between its two new neighbours", () => {
    const position = positionForMove(rows("a0", "a1", "a2"), 0, 1);

    expect(position > "a1" && position < "a2").toBe(true);
  });

  it("keeps the position when the row does not move", () => {
    expect(positionForMove(rows("a0", "a1"), 1, 1)).toBe("a1");
  });

  it("still finds a place when two neighbours share a position", () => {
    const position = positionForMove(rows("a0", "a1", "a1", "a2"), 0, 1);

    expect(position > "a1" && position < "a2").toBe(true);
  });
});

describe("positionAtEnd", () => {
  it("goes after the last row, or starts a list", () => {
    expect(positionAtEnd(rows("a0", "a5")) > "a5").toBe(true);
    expect(positionAtEnd([])).toBe("a0");
  });
});
