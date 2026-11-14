import { describe, expect, it } from "vitest";
import { mergeSync } from "./sync-store";
import { aProject, aSubtask, aTask } from "./test-rows";
import type { SyncResponse } from "./types";

const settings = { timezone: "Asia/Bangkok", weekStart: "mon" } as const;

function response(rows: Partial<SyncResponse>): SyncResponse {
  return { tasks: [], projects: [], subtasks: [], settings, cursor: 100, ...rows };
}

describe("mergeSync", () => {
  it("builds the store from the full load", () => {
    const store = mergeSync(
      undefined,
      response({
        tasks: [aTask({ id: "t1" })],
        projects: [aProject({ id: "p1" })],
        subtasks: [aSubtask({ id: "s1", taskId: "t1" })],
      }),
    );

    expect(Object.keys(store.tasks)).toEqual(["t1"]);
    expect(Object.keys(store.projects)).toEqual(["p1"]);
    expect(Object.keys(store.subtasks)).toEqual(["s1"]);
    expect(store.cursor).toBe(100);
    expect(store.settings).toEqual(settings);
  });

  it("adds and updates rows from a delta and moves the cursor", () => {
    const store = mergeSync(undefined, response({ tasks: [aTask({ id: "t1", title: "old" })] }));

    const next = mergeSync(
      store,
      response({ tasks: [aTask({ id: "t1", title: "new", updatedAt: 2 }), aTask({ id: "t2" })], cursor: 200 }),
    );

    expect(next.tasks.t1?.title).toBe("new");
    expect(next.tasks.t2).toBeDefined();
    expect(next.cursor).toBe(200);
  });

  it("removes rows that come back as tombstones", () => {
    const store = mergeSync(
      undefined,
      response({ tasks: [aTask({ id: "t1" })], subtasks: [aSubtask({ id: "s1", taskId: "t1" })] }),
    );

    const next = mergeSync(
      store,
      response({
        tasks: [aTask({ id: "t1", deletedAt: 5, updatedAt: 5 })],
        subtasks: [aSubtask({ id: "s1", taskId: "t1", deletedAt: 5, updatedAt: 5 })],
      }),
    );

    expect(next.tasks.t1).toBeUndefined();
    expect(next.subtasks.s1).toBeUndefined();
  });

  it("keeps the newer row when the overlapping cursor sends an older copy", () => {
    const store = mergeSync(undefined, response({ tasks: [aTask({ id: "t1", title: "newer", updatedAt: 9 })] }));

    const next = mergeSync(store, response({ tasks: [aTask({ id: "t1", title: "older", updatedAt: 3 })] }));

    expect(next.tasks.t1?.title).toBe("newer");
  });

  it("leaves untouched rows as the same objects, so unchanged rows do not re-render", () => {
    const store = mergeSync(undefined, response({ tasks: [aTask({ id: "t1" }), aTask({ id: "t2" })] }));

    const next = mergeSync(store, response({ tasks: [aTask({ id: "t2", updatedAt: 2 })] }));

    expect(next.tasks.t1).toBe(store.tasks.t1);
  });
});
