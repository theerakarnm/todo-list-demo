import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiAs } from "../test/api";
import { runCronAt } from "../test/cron";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newId } from "../test/ids";
import { signUpVerifiedUser } from "../test/sign-up-user";
import { testBrowser } from "../test/test-browser";
import { createTestUser } from "../test/users";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PATCH /api/settings", () => {
  it("answers 401 without a session", async () => {
    const response = await testBrowser().sendJson("PATCH", "/api/settings", { theme: "dark" });

    expect(response.status).toBe(401);
  });

  it("saves only the fields sent and returns the settings", async () => {
    const browser = await signUpVerifiedUser(internet);

    const response = await browser.sendJson("PATCH", "/api/settings", {
      theme: "dark",
      startPage: "inbox",
      weekStart: "sun",
      timezone: "Asia/Tokyo",
    });

    expect(response.status).toBe(200);
    const { settings } = await response.json<{ settings: Record<string, unknown> }>();
    expect(settings).toMatchObject({ theme: "dark", startPage: "inbox", weekStart: "sun", timezone: "Asia/Tokyo", digestTime: "08:00" });
    const me = await (await browser.request("/api/me")).json<{ settings: unknown }>();
    expect(me.settings).toEqual(settings);
  });

  it("answers 400 VALIDATION_ERROR for an unknown theme and changes nothing", async () => {
    const browser = await signUpVerifiedUser(internet);

    const response = await browser.sendJson("PATCH", "/api/settings", { theme: "sepia", weekStart: "sun" });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    const me = await (await browser.request("/api/me")).json<{ settings: { weekStart: string } }>();
    expect(me.settings.weekStart).toBe("mon");
  });

  it("accepts an empty update", async () => {
    const browser = await signUpVerifiedUser(internet);

    const response = await browser.sendJson("PATCH", "/api/settings", {});

    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/settings with a new time zone", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** A user in `timezone` with a subscribed browser and one task due at 09:30 local on `dueDate`. */
  async function userWithReminder(timezone: string, dueDate: string) {
    const userId = await createTestUser({ timezone });
    const subscription = await internet.push.subscribe();
    await apiAs(userId).post("/api/push/subscribe", subscription);
    const response = await apiAs(userId).put(`/api/tasks/${newId()}`, {
      title: "ประชุม",
      position: "a0",
      dueDate,
      dueTime: "09:30",
    });
    expect(response.status).toBe(200);
    return { userId, endpoint: subscription.endpoint };
  }

  it("moves reminders to the due time in the new time zone", async () => {
    const { userId, endpoint } = await userWithReminder("Asia/Bangkok", "2030-01-10");

    await apiAs(userId).patch("/api/settings", { timezone: "Asia/Tokyo" });
    // 09:30 in Tokyo (UTC+9).
    await runCronAt(Date.UTC(2030, 0, 10, 0, 30));

    expect(internet.push.payloadsTo(endpoint)).toHaveLength(1);
  });

  it("sends a sent reminder again when the new time is still ahead", async () => {
    const { userId, endpoint } = await userWithReminder("Asia/Tokyo", "2030-01-11");
    await runCronAt(Date.UTC(2030, 0, 11, 0, 30));

    await apiAs(userId).patch("/api/settings", { timezone: "Asia/Bangkok" });
    // 09:30 in Bangkok (UTC+7).
    await runCronAt(Date.UTC(2030, 0, 11, 2, 30));

    expect(internet.push.payloadsTo(endpoint)).toHaveLength(2);
  });

  it("does not send a sent reminder again when the new time has passed", async () => {
    const { userId, endpoint } = await userWithReminder("Asia/Bangkok", "2020-01-10");
    await runCronAt(Date.UTC(2020, 0, 10, 2, 30));

    await apiAs(userId).patch("/api/settings", { timezone: "Asia/Tokyo" });
    await runCronAt(Date.UTC(2020, 0, 10, 3, 0));

    expect(internet.push.payloadsTo(endpoint)).toHaveLength(1);
  });
});
