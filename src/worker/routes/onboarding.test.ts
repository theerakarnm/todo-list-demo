import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { signUpVerifiedUser } from "../test/sign-up-user";
import { type TestBrowser, testBrowser } from "../test/test-browser";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const allStarterProjects = [
  { key: "work", name: "งาน" },
  { key: "personal", name: "ส่วนตัว" },
  { key: "yearGoals", name: "เป้าหมายปีนี้" },
];

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function completeOnboarding(browser: TestBrowser, body: object) {
  return browser.postJson("/api/onboarding/complete", body);
}

async function projectsOf(browser: TestBrowser) {
  const me = await (await browser.request("/api/me")).json<{ user: { id: string } }>();
  const { results } = await env.DB.prepare("SELECT id, name, color, position FROM projects WHERE user_id = ? ORDER BY position")
    .bind(me.user.id)
    .all<{ id: string; name: string; color: string; position: string }>();
  return results;
}

async function settingsOf(browser: TestBrowser) {
  return (await (await browser.request("/api/me")).json<{ settings: Record<string, unknown> }>()).settings;
}

describe("POST /api/onboarding/complete", () => {
  it("answers 401 without a session", async () => {
    const response = await completeOnboarding(testBrowser(), { displayName: "แจม", theme: "dark", starterProjects: [] });

    expect(response.status).toBe(401);
  });

  it("saves the name, theme and time zone, creates the starter projects and marks onboarding done", async () => {
    const browser = await signUpVerifiedUser(internet);

    const response = await completeOnboarding(browser, {
      displayName: "แจม",
      theme: "dark",
      timezone: "Asia/Tokyo",
      starterProjects: allStarterProjects,
    });

    expect(response.status).toBe(200);
    const projects = await projectsOf(browser);
    expect(projects.map(({ name, color }) => ({ name, color }))).toEqual([
      { name: "งาน", color: "blue" },
      { name: "ส่วนตัว", color: "orange" },
      { name: "เป้าหมายปีนี้", color: "violet" },
    ]);
    for (const project of projects) expect(project.id).toMatch(UUID_V7);
    expect(await settingsOf(browser)).toMatchObject({
      displayName: "แจม",
      theme: "dark",
      timezone: "Asia/Tokyo",
      onboardedAt: expect.any(Number),
    });
  });

  it("creates only the ticked projects", async () => {
    const browser = await signUpVerifiedUser(internet);

    await completeOnboarding(browser, { displayName: "แจม", theme: "system", starterProjects: [allStarterProjects[2]] });

    expect((await projectsOf(browser)).map((project) => project.name)).toEqual(["เป้าหมายปีนี้"]);
  });

  it("names each project as the client sent it, with the colour of its key", async () => {
    const browser = await signUpVerifiedUser(internet);

    await completeOnboarding(browser, { displayName: "แจม", theme: "system", starterProjects: [{ key: "personal", name: "Personal" }] });

    expect((await projectsOf(browser)).map(({ name, color }) => ({ name, color }))).toEqual([{ name: "Personal", color: "orange" }]);
  });

  it("creates the three extra projects with the mockup colours, after the first three", async () => {
    const browser = await signUpVerifiedUser(internet);

    await completeOnboarding(browser, {
      displayName: "แจม",
      theme: "system",
      starterProjects: [
        { key: "finance", name: "การเงิน" },
        { key: "family", name: "ครอบครัว" },
        { key: "learning", name: "เรียนรู้" },
      ],
    });

    expect((await projectsOf(browser)).map(({ name, color }) => ({ name, color }))).toEqual([
      { name: "เรียนรู้", color: "green" },
      { name: "ครอบครัว", color: "black" },
      { name: "การเงิน", color: "blue" },
    ]);
  });

  it("creates nothing on Skip, but still marks onboarding done", async () => {
    const browser = await signUpVerifiedUser(internet);

    await completeOnboarding(browser, { displayName: "แจม", theme: "light", starterProjects: [] });

    expect(await projectsOf(browser)).toEqual([]);
    expect(await settingsOf(browser)).toMatchObject({ onboardedAt: expect.any(Number) });
  });

  it("creates nothing and changes nothing the second time", async () => {
    const browser = await signUpVerifiedUser(internet);
    await completeOnboarding(browser, { displayName: "แจม", theme: "dark", starterProjects: allStarterProjects });
    const settingsAfterFirst = await settingsOf(browser);

    const second = await completeOnboarding(browser, { displayName: "อีกชื่อ", theme: "light", starterProjects: allStarterProjects });

    expect(second.status).toBe(200);
    expect(await projectsOf(browser)).toHaveLength(3);
    expect(await settingsOf(browser)).toEqual(settingsAfterFirst);
  });

  it("keeps the default time zone when the browser sends an unknown one", async () => {
    const browser = await signUpVerifiedUser(internet);

    await completeOnboarding(browser, { displayName: "แจม", theme: "dark", timezone: "Mars/Olympus", starterProjects: [] });

    expect(await settingsOf(browser)).toMatchObject({ timezone: "Asia/Bangkok" });
  });

  it.each([
    ["a key outside the fixed list", { starterProjects: [{ key: "chores", name: "งานบ้าน" }] }],
    ["more than six projects", { starterProjects: Array(7).fill(allStarterProjects[0]) }],
    ["an empty display name", { displayName: " " }],
  ])("answers 400 VALIDATION_ERROR for %s", async (_case, override) => {
    const browser = await signUpVerifiedUser(internet);

    const response = await completeOnboarding(browser, { displayName: "แจม", theme: "dark", starterProjects: [], ...override });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});
