import { describe, expect, it } from "vitest";
import { idSchema } from "../../shared/schemas/fields";
import { uuidv7 } from "./uuidv7";

describe("uuidv7", () => {
  it("makes ids the API accepts", () => {
    expect(idSchema.safeParse(uuidv7()).success).toBe(true);
  });

  it("starts with the time, so later ids sort after earlier ones", () => {
    const earlier = uuidv7(Date.UTC(2026, 10, 14));
    const later = uuidv7(Date.UTC(2026, 10, 15));

    expect(earlier < later).toBe(true);
    expect(earlier.startsWith("01a1d75a-9400")).toBe(true);
  });

  it("never repeats", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()));

    expect(ids.size).toBe(1000);
  });
});
