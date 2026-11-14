import { describe, expect, it } from "vitest";
import {
  compareForAutoSort,
  completedTasks,
  inboxTasks,
  projectTasks,
  sidebarCounts,
  sortedProjects,
  subtaskProgress,
  todayGroups,
  upcomingDays,
} from "./selectors";
import { aProject, aSubtask, aTask, storeWith } from "./test-rows";
import type { Task } from "./types";

const ids = (tasks: Task[]) => tasks.map((task) => task.id);

// 23:30 on Saturday 14 Nov in Bangkok (UTC+7); still 16:30 on the 14th in UTC.
const lateSaturdayInBangkok = Date.UTC(2026, 10, 14, 16, 30);
// 00:30 on Sunday 15 Nov in Bangkok; 17:30 on the 14th in UTC.
const earlySundayInBangkok = Date.UTC(2026, 10, 14, 17, 30);

describe("compareForAutoSort", () => {
  it("sorts by due time (no time last), then priority high to none, then creation", () => {
    const tasks = [
      aTask({ id: "no-time-high", priority: "high", createdAt: 1 }),
      aTask({ id: "late", dueTime: "16:00", priority: "none" }),
      aTask({ id: "early", dueTime: "09:00", priority: "none" }),
      aTask({ id: "no-time-none-new", priority: "none", createdAt: 9 }),
      aTask({ id: "no-time-none-old", priority: "none", createdAt: 2 }),
      aTask({ id: "no-time-low", priority: "low", createdAt: 1 }),
      aTask({ id: "no-time-medium", priority: "medium", createdAt: 1 }),
    ];

    expect(ids(tasks.sort(compareForAutoSort))).toEqual([
      "early",
      "late",
      "no-time-high",
      "no-time-medium",
      "no-time-low",
      "no-time-none-old",
      "no-time-none-new",
    ]);
  });
});

describe("inboxTasks", () => {
  it("lists active tasks without a project in position order", () => {
    const store = storeWith({
      projects: [aProject({ id: "p1" })],
      tasks: [
        aTask({ id: "second", position: "a2" }),
        aTask({ id: "first", position: "a1" }),
        aTask({ id: "in-project", projectId: "p1" }),
        aTask({ id: "done", completedAt: 5 }),
      ],
    });

    expect(ids(inboxTasks(store))).toEqual(["first", "second"]);
  });
});

describe("projectTasks", () => {
  it("lists the project's active tasks in position order", () => {
    const store = storeWith({
      tasks: [
        aTask({ id: "b", projectId: "p1", position: "a2" }),
        aTask({ id: "a", projectId: "p1", position: "a1" }),
        aTask({ id: "other", projectId: "p2" }),
        aTask({ id: "done", projectId: "p1", completedAt: 5 }),
      ],
    });

    expect(ids(projectTasks(store, "p1"))).toEqual(["a", "b"]);
  });
});

describe("todayGroups", () => {
  const store = storeWith({
    tasks: [
      aTask({ id: "due-13th", dueDate: "2026-11-13" }),
      aTask({ id: "due-14th", dueDate: "2026-11-14" }),
      aTask({ id: "due-15th", dueDate: "2026-11-15" }),
      aTask({ id: "no-date" }),
      aTask({ id: "done-13th", dueDate: "2026-11-13", completedAt: 5 }),
    ],
  });

  it("splits overdue from today in the user's time zone", () => {
    const groups = todayGroups(store, lateSaturdayInBangkok);

    expect(groups.today).toBe("2026-11-14");
    expect(ids(groups.overdue)).toEqual(["due-13th"]);
    expect(ids(groups.dueToday)).toEqual(["due-14th"]);
  });

  it("moves to the next day at local midnight, not at UTC midnight", () => {
    const inBangkok = todayGroups(store, earlySundayInBangkok);
    const inUtc = todayGroups(storeWith({ tasks: Object.values(store.tasks) }, "UTC"), earlySundayInBangkok);

    expect(ids(inBangkok.overdue)).toEqual(["due-13th", "due-14th"]);
    expect(ids(inBangkok.dueToday)).toEqual(["due-15th"]);
    expect(ids(inUtc.dueToday)).toEqual(["due-14th"]);
  });

  it("sorts each group automatically", () => {
    const groups = todayGroups(
      storeWith({
        tasks: [
          aTask({ id: "low", dueDate: "2026-11-14", priority: "low" }),
          aTask({ id: "timed", dueDate: "2026-11-14", dueTime: "10:00" }),
          aTask({ id: "high", dueDate: "2026-11-14", priority: "high" }),
        ],
      }),
      lateSaturdayInBangkok,
    );

    expect(ids(groups.dueToday)).toEqual(["timed", "high", "low"]);
  });
});

describe("upcomingDays", () => {
  it("has one entry per day from tomorrow, empty days included", () => {
    const store = storeWith({
      tasks: [
        aTask({ id: "today", dueDate: "2026-11-14" }),
        aTask({ id: "tomorrow", dueDate: "2026-11-15" }),
        aTask({ id: "in-a-week", dueDate: "2026-11-21" }),
        aTask({ id: "too-far", dueDate: "2026-11-22" }),
      ],
    });

    const days = upcomingDays(store, lateSaturdayInBangkok, 7);

    expect(days.map((day) => day.date)).toEqual([
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
    ]);
    expect(ids(days[0]?.tasks ?? [])).toEqual(["tomorrow"]);
    expect(days[1]?.tasks).toEqual([]);
    expect(ids(days[6]?.tasks ?? [])).toEqual(["in-a-week"]);
  });

  it("starts the day after the user's local today", () => {
    const store = storeWith({ tasks: [aTask({ id: "sunday", dueDate: "2026-11-15" })] });

    const days = upcomingDays(store, earlySundayInBangkok, 7);

    expect(days[0]?.date).toBe("2026-11-16");
    expect(days.flatMap((day) => ids(day.tasks))).toEqual([]);
  });

  it("covers 30 days when asked", () => {
    expect(upcomingDays(storeWith({}), lateSaturdayInBangkok, 30).at(-1)?.date).toBe("2026-12-14");
  });
});

describe("sidebarCounts", () => {
  it("counts active tasks in the Inbox, in Today (overdue included) and per project", () => {
    const store = storeWith({
      projects: [aProject({ id: "p1" }), aProject({ id: "empty" })],
      tasks: [
        aTask({ id: "inbox-overdue", dueDate: "2026-11-01" }),
        aTask({ id: "inbox-later" }),
        aTask({ id: "project-today", projectId: "p1", dueDate: "2026-11-14" }),
        aTask({ id: "project-done", projectId: "p1", completedAt: 5, dueDate: "2026-11-14" }),
      ],
    });

    expect(sidebarCounts(store, lateSaturdayInBangkok)).toEqual({ inbox: 2, today: 2, projects: { p1: 1 } });
  });
});

describe("sortedProjects", () => {
  it("orders projects by position", () => {
    const store = storeWith({
      projects: [aProject({ id: "b", position: "a2" }), aProject({ id: "a", position: "a1" })],
    });

    expect(sortedProjects(store).map((project) => project.id)).toEqual(["a", "b"]);
  });
});

describe("subtaskProgress", () => {
  it("counts the task's done and total subtasks", () => {
    const store = storeWith({
      subtasks: [
        aSubtask({ id: "s1", taskId: "t1", completedAt: 5 }),
        aSubtask({ id: "s2", taskId: "t1" }),
        aSubtask({ id: "s3", taskId: "t2" }),
      ],
    });

    expect(subtaskProgress(store).get("t1")).toEqual({ done: 1, total: 2 });
    expect(subtaskProgress(store).get("t3")).toBeUndefined();
  });
});

describe("completedTasks", () => {
  it("merges this device's fresh completions with the Logbook, newest first", () => {
    const store = storeWith({
      tasks: [
        aTask({ id: "just-done", completedAt: 30 }),
        aTask({ id: "unticked", completedAt: null }),
        aTask({ id: "other-project", projectId: "p2", completedAt: 40 }),
      ],
    });
    const logbook = [aTask({ id: "older", completedAt: 10 }), aTask({ id: "unticked", completedAt: 20 })];

    expect(ids(completedTasks(store, logbook, null))).toEqual(["just-done", "older"]);
    expect(ids(completedTasks(store, logbook))).toEqual(["other-project", "just-done", "older"]);
  });
});
