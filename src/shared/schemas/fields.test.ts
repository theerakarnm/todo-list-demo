import { describe, expect, it } from "vitest";
import { positionSchema } from "./fields";

describe("positionSchema", () => {
  it("accepts fractional-index keys", () => {
    for (const key of ["a0", "a1", "Zz", "a0V"]) {
      expect(positionSchema.safeParse(key).success).toBe(true);
    }
  });

  it("rejects strings that are not fractional-index keys, so the server can always add after them", () => {
    for (const key of ["", "a", "a00", "!!", "a0 "]) {
      expect(positionSchema.safeParse(key).success).toBe(false);
    }
  });
});
