import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiAs } from "../test/api";
import { runCronAt } from "../test/cron";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newId } from "../test/ids";
import { createTestUser } from "../test/users";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const TODAY = "2026-12-01";
// 08:00 on 2026-12-01 in Bangkok (UTC+7).
const EIGHT_AM = Date.UTC(2026, 11, 1, 1, 0);
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** A Bangkok user with the 08:00 digest on and this browser subscribed. */
async function digestUser({ digestEnabled = true } = {}) {
  const userId = await createTestUser({ timezone: "Asia/Bangkok" });
  await apiAs(userId).patch("/api/settings", { digestEnabled, digestTime: "08:00" });
  const subscription = await internet.push.subscribe();
  await apiAs(userId).post("/api/push/subscribe", subscription);
  return { userId, endpoint: subscription.endpoint };
}

async function createTask(userId: string, dueDate: string) {
  const id = newId();
  const response = await apiAs(userId).put(`/api/tasks/${id}`, { title: "งาน", position: "a0", dueDate });
  expect(response.status).toBe(200);
  return id;
}

describe("the daily digest cron", () => {
  it("sends today's and overdue counts at the chosen time, opening Today", async () => {
    const { userId, endpoint } = await digestUser();
    await createTask(userId, TODAY);
    await createTask(userId, TODAY);
    await createTask(userId, "2026-11-28");
    await createTask(userId, "2026-12-02");
    const completed = await createTask(userId, TODAY);
    await apiAs(userId).patch(`/api/tasks/${completed}`, { completed: true });
    const deleted = await createTask(userId, "2026-11-30");
    await apiAs(userId).delete(`/api/tasks/${deleted}`);

    await runCronAt(EIGHT_AM);

    expect(internet.push.payloadsTo(endpoint)).toEqual([
      { title: "สรุปงานประจำวัน", body: "วันนี้มี 2 งาน · เลยกำหนด 1 งาน", url: "/today", tag: "digest" },
    ]);
  });

  it("waits until the chosen time in the user's time zone", async () => {
    const { userId, endpoint } = await digestUser();
    await createTask(userId, TODAY);

    await runCronAt(EIGHT_AM - MINUTE);

    expect(internet.push.payloadsTo(endpoint)).toEqual([]);
  });

  it("sends once per local day", async () => {
    const { userId, endpoint } = await digestUser();
    await createTask(userId, TODAY);

    await runCronAt(EIGHT_AM);
    await runCronAt(EIGHT_AM + MINUTE);
    await runCronAt(EIGHT_AM + 10 * 60 * MINUTE);
    expect(internet.push.payloadsTo(endpoint)).toHaveLength(1);

    await runCronAt(EIGHT_AM + DAY);
    expect(internet.push.payloadsTo(endpoint)).toHaveLength(2);
  });

  it("sends nothing on a day with nothing due or overdue, even if a task comes later that day", async () => {
    const { userId, endpoint } = await digestUser();

    await runCronAt(EIGHT_AM);
    await createTask(userId, TODAY);
    await runCronAt(EIGHT_AM + 5 * MINUTE);

    expect(internet.push.payloadsTo(endpoint)).toEqual([]);
  });

  it("sends nothing while the digest is off", async () => {
    const { userId, endpoint } = await digestUser({ digestEnabled: false });
    await createTask(userId, TODAY);

    await runCronAt(EIGHT_AM);

    expect(internet.push.payloadsTo(endpoint)).toEqual([]);
  });
});
