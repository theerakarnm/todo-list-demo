import { describe, expect, it } from "vitest";
import { aProject, aTask, storeWith } from "../data/test-rows";
import { planDrop } from "./plan-drop";

const inbox = [
  aTask({ id: "i1", position: "a0" }),
  aTask({ id: "i2", position: "a1" }),
  aTask({ id: "i3", position: "a2" }),
];
const work = aProject({ id: "work", position: "a0" });
const home = aProject({ id: "home", position: "a1" });
const life = aProject({ id: "life", position: "a2" });
const workTask = aTask({ id: "w1", projectId: work.id, dueDate: "2026-11-15" });
const store = storeWith({ tasks: [...inbox, workTask], projects: [work, home, life] });

describe("planDrop", () => {
  it("reorders a task within its list, writing only its new position", () => {
    const plan = planDrop(store, { type: "task", id: "i1" }, { type: "task", id: "i2" });

    expect(plan).toMatchObject({ kind: "taskPosition", task: { id: "i1" } });
    expect(plan?.kind === "taskPosition" && plan.position > "a1" && plan.position < "a2").toBe(true);
  });

  it("ignores a drop on the task itself or on a task in another list", () => {
    expect(planDrop(store, { type: "task", id: "i1" }, { type: "task", id: "i1" })).toBeNull();
    expect(planDrop(store, { type: "task", id: "i1" }, { type: "task", id: "w1" })).toBeNull();
  });

  it("moves a task onto a sidebar project, unless it is already there", () => {
    expect(planDrop(store, { type: "task", id: "i2" }, { type: "project", id: "home" })).toEqual({
      kind: "taskProject",
      task: inbox[1],
      projectId: "home",
    });
    expect(planDrop(store, { type: "task", id: "w1" }, { type: "project", id: "work" })).toBeNull();
  });

  it("reschedules a task dropped on another Upcoming day", () => {
    expect(planDrop(store, { type: "task", id: "w1" }, { type: "day", id: "2026-11-17" })).toEqual({
      kind: "taskDueDate",
      task: workTask,
      dueDate: "2026-11-17",
    });
    expect(planDrop(store, { type: "task", id: "w1" }, { type: "day", id: "2026-11-15" })).toBeNull();
  });

  it("reorders projects in the sidebar", () => {
    const plan = planDrop(store, { type: "project", id: "life" }, { type: "project", id: "work" });

    expect(plan).toMatchObject({ kind: "projectPosition", project: { id: "life" } });
    expect(plan?.kind === "projectPosition" && plan.position < "a0").toBe(true);
  });

  it("does nothing without a target or with rows that are gone", () => {
    expect(planDrop(store, { type: "task", id: "i1" }, undefined)).toBeNull();
    expect(planDrop(store, { type: "task", id: "gone" }, { type: "project", id: "home" })).toBeNull();
    expect(planDrop(store, { type: "project", id: "work" }, { type: "day", id: "2026-11-17" })).toBeNull();
  });
});
