import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newTestEmail, signUpVerifiedUser, TEST_PASSWORD } from "../test/sign-up-user";
import { TEST_ORIGIN, testBrowser } from "../test/test-browser";

const newPassword = "new-battery-staple-2";

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

describe("password reset", () => {
  it("emails a Thai link to the client /reset-password page", async () => {
    const email = newTestEmail();
    await signUpVerifiedUser(internet, email);

    const response = await testBrowser().postJson("/api/auth/request-password-reset", { email });

    expect(response.status).toBe(200);
    expect(internet.sentEmails.at(-1)?.subject).toMatch(/[\u0E00-\u0E7F]/);
    const link = new URL(internet.linkInLastEmailTo(email));
    expect(link.origin + link.pathname).toBe(`${TEST_ORIGIN}/reset-password`);
    expect(link.searchParams.get("token")).toBeTruthy();
  });

  it("sets the new password and retires the old one", async () => {
    const email = newTestEmail();
    await signUpVerifiedUser(internet, email);
    await testBrowser().postJson("/api/auth/request-password-reset", { email });
    const token = new URL(internet.linkInLastEmailTo(email)).searchParams.get("token");

    const reset = await testBrowser().postJson("/api/auth/reset-password", { token, newPassword });

    expect(reset.status).toBe(200);
    expect((await signIn(email, newPassword)).status).toBe(200);
    expect((await signIn(email, TEST_PASSWORD)).status).toBe(401);
  });

  it("signs out every existing session", async () => {
    const email = newTestEmail();
    const signedInBrowser = await signUpVerifiedUser(internet, email);
    await testBrowser().postJson("/api/auth/request-password-reset", { email });
    const token = new URL(internet.linkInLastEmailTo(email)).searchParams.get("token");

    await testBrowser().postJson("/api/auth/reset-password", { token, newPassword });

    const session = await signedInBrowser.request("/api/auth/get-session");
    expect(await session.json()).toBeNull();
  });

  it("refuses a token that was already used", async () => {
    const email = newTestEmail();
    await signUpVerifiedUser(internet, email);
    await testBrowser().postJson("/api/auth/request-password-reset", { email });
    const token = new URL(internet.linkInLastEmailTo(email)).searchParams.get("token");
    await testBrowser().postJson("/api/auth/reset-password", { token, newPassword });

    const again = await testBrowser().postJson("/api/auth/reset-password", { token, newPassword: "another-pass-3" });

    expect(again.status).toBe(400);
  });
});
