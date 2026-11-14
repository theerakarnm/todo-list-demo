import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import type { tasks } from "../db/schema";
import { apiAs, bodyOf } from "../test/api";
import { runCronAt } from "../test/cron";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newId } from "../test/ids";
import { insertProject } from "../test/seed";
import { createTestUser } from "../test/users";

type Task = Omit<typeof tasks.$inferSelect, "userId">;

let internet: FakeInternet;
let log: MockInstance<typeof console.log>;

beforeEach(() => {
  internet = fakeInternet();
  log = vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// 09:30 on 2026-12-01 in Bangkok (UTC+7).
const DUE = { dueDate: "2026-12-01", dueTime: "09:30" };
const DUE_AT = Date.UTC(2026, 11, 1, 2, 30);
const MINUTE = 60_000;

/** A Bangkok user with this browser subscribed to push. */
async function subscribedUser() {
  const userId = await createTestUser({ timezone: "Asia/Bangkok" });
  const subscription = await internet.push.subscribe();
  await apiAs(userId).post("/api/push/subscribe", subscription);
  return { userId, endpoint: subscription.endpoint };
}

async function createTask(userId: string, fields: Record<string, unknown> = {}) {
  const response = await apiAs(userId).put(`/api/tasks/${newId()}`, { title: "โทรนัดช่างแอร์", position: "a0", ...fields });
  expect(response.status).toBe(200);
  return bodyOf<Task>(response);
}

describe("the reminder cron", () => {
  it("sends a reminder at the due time with the task title, the Inbox label and a link to the task", async () => {
    const { userId, endpoint } = await subscribedUser();
    const task = await createTask(userId, DUE);

    await runCronAt(DUE_AT);

    expect(internet.push.payloadsTo(endpoint)).toEqual([
      { title: "โทรนัดช่างแอร์", body: "Inbox", url: `/task/${task.id}`, tag: `task-${task.id}` },
    ]);
  });

  it("waits until the due time", async () => {
    const { userId, endpoint } = await subscribedUser();
    await createTask(userId, DUE);

    await runCronAt(DUE_AT - MINUTE);

    expect(internet.push.payloadsTo(endpoint)).toEqual([]);
  });

  it("marks the reminder sent, so the next run does not send it again", async () => {
    const { userId, endpoint } = await subscribedUser();
    const task = await createTask(userId, DUE);

    await runCronAt(DUE_AT);
    await runCronAt(DUE_AT + MINUTE);

    expect(internet.push.payloadsTo(endpoint)).toHaveLength(1);
    const row = await env.DB.prepare("SELECT reminder_sent_at FROM tasks WHERE id = ?").bind(task.id).first();
    expect(row?.reminder_sent_at).toBe(DUE_AT);
  });

  it("sends once even when two runs overlap", async () => {
    const { userId, endpoint } = await subscribedUser();
    await createTask(userId, DUE);

    await Promise.all([runCronAt(DUE_AT), runCronAt(DUE_AT)]);

    expect(internet.push.payloadsTo(endpoint)).toHaveLength(1);
  });

  it("uses the project name as the body", async () => {
    const { userId, endpoint } = await subscribedUser();
    const projectId = await insertProject(userId);
    await createTask(userId, { ...DUE, projectId });

    await runCronAt(DUE_AT);

    expect(internet.push.payloadsTo(endpoint)).toEqual([expect.objectContaining({ body: "งาน" })]);
  });

  it("reaches every device of the owner and nobody else", async () => {
    const { userId, endpoint } = await subscribedUser();
    const otherDevice = await internet.push.subscribe();
    await apiAs(userId).post("/api/push/subscribe", otherDevice);
    const someoneElse = await subscribedUser();
    await createTask(userId, DUE);

    await runCronAt(DUE_AT);

    expect(internet.push.payloadsTo(endpoint)).toHaveLength(1);
    expect(internet.push.payloadsTo(otherDevice.endpoint)).toHaveLength(1);
    expect(internet.push.payloadsTo(someoneElse.endpoint)).toEqual([]);
  });

  it("skips tasks that are completed, deleted or have no due time", async () => {
    const { userId, endpoint } = await subscribedUser();
    const completed = await createTask(userId, DUE);
    await apiAs(userId).patch(`/api/tasks/${completed.id}`, { completed: true });
    const deleted = await createTask(userId, DUE);
    await apiAs(userId).delete(`/api/tasks/${deleted.id}`);
    await createTask(userId, { dueDate: DUE.dueDate });

    await runCronAt(DUE_AT + MINUTE);

    expect(internet.push.payloadsTo(endpoint)).toEqual([]);
  });

  it("sends again after the due time changes", async () => {
    const { userId, endpoint } = await subscribedUser();
    const task = await createTask(userId, DUE);
    await runCronAt(DUE_AT);

    await apiAs(userId).patch(`/api/tasks/${task.id}`, { dueTime: "10:00" });
    await runCronAt(DUE_AT + 29 * MINUTE);
    expect(internet.push.payloadsTo(endpoint)).toHaveLength(1);
    await runCronAt(DUE_AT + 30 * MINUTE);

    expect(internet.push.payloadsTo(endpoint)).toHaveLength(2);
  });

  it.each([404, 410])("deletes a subscription the push service answers %i for", async (status) => {
    const { userId, endpoint } = await subscribedUser();
    internet.push.answer(endpoint, status);
    await createTask(userId, DUE);

    await runCronAt(DUE_AT);

    const row = await env.DB.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).first();
    expect(row).toBeNull();
  });

  it("keeps a subscription after another failure, and still delivers the rest of the batch", async () => {
    const failing = await subscribedUser();
    internet.push.answer(failing.endpoint, 500);
    const working = await subscribedUser();
    await createTask(failing.userId, DUE);
    await createTask(working.userId, DUE);

    await runCronAt(DUE_AT);

    expect(internet.push.payloadsTo(working.endpoint)).toHaveLength(1);
    const row = await env.DB.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?")
      .bind(failing.endpoint)
      .first();
    expect(row).not.toBeNull();
  });

  it("logs counts only, never the task, the endpoint or the user", async () => {
    const { userId, endpoint } = await subscribedUser();
    await createTask(userId, DUE);

    await runCronAt(DUE_AT);

    const lines = log.mock.calls.map(([line]) => String(line));
    const reminderLine = lines.map((line) => JSON.parse(line)).find((line) => line.job === "reminders");
    expect(reminderLine).toMatchObject({ event: "cron", job: "reminders", sent: 1 });
    for (const line of lines) {
      expect(line).not.toContain("โทรนัดช่างแอร์");
      expect(line).not.toContain(endpoint);
      expect(line).not.toContain(userId);
    }
  });
});
