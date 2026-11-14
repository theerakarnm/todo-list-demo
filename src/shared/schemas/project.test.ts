import { describe, expect, it } from "vitest";
import { createProjectSchema, updateProjectSchema } from "./project";

describe("createProjectSchema", () => {
  it("accepts a name and one of the five colours", () => {
    expect(createProjectSchema.parse({ name: " งาน ", color: "orange", position: "a0" })).toEqual({
      name: "งาน",
      color: "orange",
      position: "a0",
    });
  });

  it("rejects names over 50 characters and unknown colours", () => {
    const base = { name: "งาน", color: "blue", position: "a0" };
    expect(createProjectSchema.safeParse({ ...base, name: "ก".repeat(51) }).success).toBe(false);
    expect(createProjectSchema.safeParse({ ...base, color: "pink" }).success).toBe(false);
  });

  it("defaults the colour to black", () => {
    expect(createProjectSchema.parse({ name: "งาน", position: "a0" }).color).toBe("black");
  });
});

describe("updateProjectSchema", () => {
  it("accepts a rename alone", () => {
    expect(updateProjectSchema.parse({ name: "ส่วนตัว" })).toEqual({ name: "ส่วนตัว" });
  });
});
