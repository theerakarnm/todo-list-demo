import { describe, expect, it } from "vitest";
import { createSubtaskSchema, updateSubtaskSchema } from "./subtask";

const taskId = "019a8c3e-1f2a-7b3c-8d4e-5f6a7b8c9d0e";

describe("createSubtaskSchema", () => {
  it("needs the parent task id, a title and a position", () => {
    expect(createSubtaskSchema.parse({ taskId, title: "โทรหาร้าน", position: "a0" })).toEqual({
      taskId,
      title: "โทรหาร้าน",
      position: "a0",
    });
    expect(createSubtaskSchema.safeParse({ title: "โทรหาร้าน", position: "a0" }).success).toBe(false);
  });

  it("rejects a title over 500 characters", () => {
    const longTitle = "ก".repeat(501);
    expect(createSubtaskSchema.safeParse({ taskId, title: longTitle, position: "a0" }).success).toBe(false);
  });
});

describe("updateSubtaskSchema", () => {
  it("can complete a subtask without other fields", () => {
    expect(updateSubtaskSchema.parse({ completed: true })).toEqual({ completed: true });
  });
});
