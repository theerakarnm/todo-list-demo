import { describe, expect, it } from "vitest";
import { createTaskSchema, undoRescheduleSchema, updateTaskSchema } from "./task";

const validTask = { title: "ซื้อนม", position: "a0" };

describe("createTaskSchema", () => {
  it("fills in defaults for optional fields", () => {
    expect(createTaskSchema.parse(validTask)).toEqual({
      title: "ซื้อนม",
      notes: "",
      priority: "none",
      projectId: null,
      dueDate: null,
      dueTime: null,
      position: "a0",
    });
  });

  it("trims the title and rejects an empty one", () => {
    expect(createTaskSchema.parse({ ...validTask, title: "  ซื้อนม  " }).title).toBe("ซื้อนม");
    expect(createTaskSchema.safeParse({ ...validTask, title: "   " }).success).toBe(false);
  });

  it("rejects a title over 500 characters and notes over 10,000", () => {
    expect(createTaskSchema.safeParse({ ...validTask, title: "ก".repeat(500) }).success).toBe(true);
    expect(createTaskSchema.safeParse({ ...validTask, title: "ก".repeat(501) }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...validTask, notes: "x".repeat(10_001) }).success).toBe(false);
  });

  it("only accepts the four priorities", () => {
    expect(createTaskSchema.safeParse({ ...validTask, priority: "high" }).success).toBe(true);
    expect(createTaskSchema.safeParse({ ...validTask, priority: "urgent" }).success).toBe(false);
  });

  it("accepts real YYYY-MM-DD dates and HH:MM times only", () => {
    const withDue = { ...validTask, dueDate: "2026-11-14", dueTime: "09:30" };
    expect(createTaskSchema.safeParse(withDue).success).toBe(true);
    expect(createTaskSchema.safeParse({ ...withDue, dueDate: "2026-02-30" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...withDue, dueTime: "24:00" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...withDue, dueTime: "9:30" }).success).toBe(false);
  });

  it("rejects a due time without a due date", () => {
    expect(createTaskSchema.safeParse({ ...validTask, dueTime: "09:30" }).success).toBe(false);
  });

  it("requires project ids to be UUIDv7", () => {
    const uuidV7 = "019a8c3e-1f2a-7b3c-8d4e-5f6a7b8c9d0e";
    const uuidV4 = "3b241101-e2bb-4255-8caf-4136c566a962";
    expect(createTaskSchema.safeParse({ ...validTask, projectId: uuidV7 }).success).toBe(true);
    expect(createTaskSchema.safeParse({ ...validTask, projectId: uuidV4 }).success).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("accepts a partial change without filling defaults", () => {
    expect(updateTaskSchema.parse({ priority: "low" })).toEqual({ priority: "low" });
    expect(updateTaskSchema.parse({ completed: true })).toEqual({ completed: true });
  });

  it("still validates the fields it receives", () => {
    expect(updateTaskSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("lets a due time change alone, because the task may already have a date", () => {
    expect(updateTaskSchema.safeParse({ dueTime: "09:30" }).success).toBe(true);
  });

  it("rejects a due time together with clearing the date", () => {
    expect(updateTaskSchema.safeParse({ dueDate: null, dueTime: "09:30" }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ dueDate: null, dueTime: null }).success).toBe(true);
  });
});

describe("undoRescheduleSchema", () => {
  it("takes the previous due dates returned by reschedule-overdue", () => {
    const tasks = [{ id: "019a8c3e-1f2a-7b3c-8d4e-5f6a7b8c9d0e", dueDate: "2026-11-10" }];
    expect(undoRescheduleSchema.parse({ tasks })).toEqual({ tasks });
    expect(undoRescheduleSchema.safeParse({ tasks: [{ id: "x", dueDate: "2026-11-10" }] }).success).toBe(false);
    expect(undoRescheduleSchema.safeParse({ tasks: [{ ...tasks[0], dueDate: null }] }).success).toBe(false);
  });
});
