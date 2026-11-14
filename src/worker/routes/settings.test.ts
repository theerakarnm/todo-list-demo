import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { signUpVerifiedUser } from "../test/sign-up-user";
import { testBrowser } from "../test/test-browser";

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
