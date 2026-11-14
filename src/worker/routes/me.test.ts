import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newLineProfile, signInWithLine } from "../test/line-sign-in";
import { newTestEmail, PASSES_TURNSTILE, signUpVerifiedUser, TEST_PASSWORD } from "../test/sign-up-user";
import { type TestBrowser, testBrowser } from "../test/test-browser";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function getMe(browser: TestBrowser) {
  const response = await browser.request("/api/me");
  return { response, body: await response.json<Record<string, Record<string, unknown>>>() };
}

describe("GET /api/me", () => {
  it("answers 401 without a session", async () => {
    const { response } = await getMe(testBrowser());

    expect(response.status).toBe(401);
  });

  it("returns an email user, with settings made on the first sign-in", async () => {
    const email = newTestEmail("somchai");
    const browser = await signUpVerifiedUser(internet, email);

    const { response, body } = await getMe(browser);

    expect(response.status).toBe(200);
    expect(body.user).toEqual({
      id: expect.any(String),
      name: email.split("@")[0],
      email,
      image: null,
      hasPassword: true,
      hasLine: false,
    });
    expect(body.settings).toEqual({
      displayName: email.split("@")[0],
      avatarKey: null,
      timezone: "Asia/Bangkok",
      theme: "system",
      startPage: "today",
      weekStart: "mon",
      digestEnabled: false,
      digestTime: "08:00",
      onboardedAt: null,
    });
  });

  it("uses the part of the email before the @ as the display name when sign-up sent no name", async () => {
    const email = newTestEmail("malee");
    const browser = testBrowser();
    // The Signup page has no name field, so it sends an empty name.
    await browser.postJson("/api/auth/sign-up/email", { name: "", email, password: TEST_PASSWORD }, PASSES_TURNSTILE);
    const link = new URL(internet.linkInLastEmailTo(email));
    await testBrowser().request(link.pathname + link.search);
    await browser.postJson("/api/auth/sign-in/email", { email, password: TEST_PASSWORD });

    const { body } = await getMe(browser);

    expect(body.settings).toMatchObject({ displayName: email.split("@")[0] });
  });

  it("returns a LINE user with the LINE name and picture", async () => {
    const email = newTestEmail("line");
    const { browser } = await signInWithLine(
      internet,
      newLineProfile({ email, name: "แจม", picture: "https://profile.line-scdn.net/jam" }),
    );

    const { body } = await getMe(browser);

    expect(body.user).toMatchObject({ email, image: "https://profile.line-scdn.net/jam", hasPassword: false, hasLine: true });
    expect(body.settings).toMatchObject({ displayName: "แจม" });
  });

  it("shows no email for a LINE-only account without one", async () => {
    const { browser } = await signInWithLine(internet, newLineProfile());

    const { body } = await getMe(browser);

    expect(body.user).toMatchObject({ email: null, hasPassword: false, hasLine: true });
  });

  it("keeps the settings when the user signs in again", async () => {
    const profile = newLineProfile({ name: "แจม" });
    const { user } = await signInWithLine(internet, profile);
    const again = await signInWithLine(internet, { ...profile, name: "ชื่อใหม่" });

    const { body } = await getMe(again.browser);

    expect(again.user?.id).toBe(user?.id);
    expect(body.settings).toMatchObject({ displayName: "แจม" });
  });
});
