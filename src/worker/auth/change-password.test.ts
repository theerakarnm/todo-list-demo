import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newLineProfile, signInWithLine } from "../test/line-sign-in";
import { newTestEmail, signUpVerifiedUser, TEST_PASSWORD } from "../test/sign-up-user";
import { testBrowser } from "../test/test-browser";

const newPassword = "brand-new-pass-7";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function signIn(email: string, password: string) {
  return testBrowser().postJson("/api/auth/sign-in/email", { email, password });
}

describe("change password (Settings → Account)", () => {
  it("replaces the password of an email account", async () => {
    const email = newTestEmail();
    const browser = await signUpVerifiedUser(internet, email);

    const response = await browser.postJson("/api/auth/change-password", {
      currentPassword: TEST_PASSWORD,
      newPassword,
      revokeOtherSessions: true,
    });

    expect(response.status).toBe(200);
    expect((await signIn(email, newPassword)).status).toBe(200);
    expect((await signIn(email, TEST_PASSWORD)).status).toBe(401);
  });

  it("answers 400 WRONG_PASSWORD in Thai for a wrong current password, not a sign-out 401", async () => {
    const browser = await signUpVerifiedUser(internet);

    const response = await browser.postJson("/api/auth/change-password", { currentPassword: "not-my-password", newPassword });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "WRONG_PASSWORD", message: expect.stringMatching(/[\u0E00-\u0E7F]/) },
    });
  });

  it("cannot be used by a LINE-only account, which has no password", async () => {
    const { browser } = await signInWithLine(internet, newLineProfile());

    const response = await browser.postJson("/api/auth/change-password", { currentPassword: "anything-at-all", newPassword });

    expect(response.status).toBe(400);
  });

  it("answers 401 without a session", async () => {
    const response = await testBrowser().postJson("/api/auth/change-password", { currentPassword: TEST_PASSWORD, newPassword });

    expect(response.status).toBe(401);
  });
});
