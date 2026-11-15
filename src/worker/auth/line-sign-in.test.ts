import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newTestEmail, PASSES_TURNSTILE, signUpVerifiedUser, TEST_PASSWORD } from "../test/sign-up-user";
import { newLineProfile, signInWithLine } from "../test/line-sign-in";
import { testBrowser } from "../test/test-browser";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function userCount(email: string) {
  const row = await env.DB.prepare("SELECT count(*) AS count FROM user WHERE email = ?").bind(email).first<{ count: number }>();
  return row?.count ?? 0;
}

async function providersOf(userId: string) {
  const { results } = await env.DB.prepare("SELECT provider_id FROM account WHERE user_id = ? ORDER BY provider_id")
    .bind(userId)
    .all<{ provider_id: string }>();
  return results.map((row) => row.provider_id);
}

describe("starting LINE sign-in", () => {
  it("sends the browser to LINE asking for openid, profile and email", async () => {
    const start = await testBrowser().postJson("/api/auth/sign-in/social", { provider: "line", callbackURL: "/today" });

    const authorizeUrl = new URL((await start.json<{ url: string }>()).url);
    expect(authorizeUrl.origin + authorizeUrl.pathname).toBe("https://access.line.me/oauth2/v2.1/authorize");
    expect(authorizeUrl.searchParams.get("client_id")).toBe("test-line-channel-id");
    expect(authorizeUrl.searchParams.get("scope")?.split(" ").sort()).toEqual(["email", "openid", "profile"]);
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe("https://jotlist.test/api/auth/callback/line");
  });
});

describe("LINE sign-in and account linking", () => {
  it("creates a new verified account for a new LINE email", async () => {
    const email = newTestEmail("line");

    const { callback, user } = await signInWithLine(internet, newLineProfile({ email, picture: "https://profile.line-scdn.net/p" }));

    expect(callback.status).toBe(302);
    expect(callback.headers.get("Location")).toBe("/today");
    expect(user).toMatchObject({ email, emailVerified: true, name: "สมชาย LINE", image: "https://profile.line-scdn.net/p" });
    expect(internet.sentEmails).toHaveLength(0);
  });

  it("signs in to the verified email account with the same email, linking LINE to it", async () => {
    const email = newTestEmail();
    const emailBrowser = await signUpVerifiedUser(internet, email);
    const emailUser = await (await emailBrowser.request("/api/auth/get-session")).json<{ user: { id: string } }>();

    const { user } = await signInWithLine(internet, newLineProfile({ email }));

    expect(user?.id).toBe(emailUser.user.id);
    expect(await providersOf(emailUser.user.id)).toEqual(["credential", "line"]);
    expect(await userCount(email)).toBe(1);
  });

  it("replaces an unverified pending sign-up with the same email by the LINE account", async () => {
    const email = newTestEmail();
    await testBrowser().postJson("/api/auth/sign-up/email", { name: "attacker", email, password: TEST_PASSWORD }, PASSES_TURNSTILE);
    const pending = await env.DB.prepare("SELECT id FROM user WHERE email = ?").bind(email).first<{ id: string }>();

    const { user } = await signInWithLine(internet, newLineProfile({ email }));

    expect(user).toMatchObject({ email, emailVerified: true });
    expect(user?.id).not.toBe(pending?.id);
    expect(await userCount(email)).toBe(1);
    expect(await providersOf(pending?.id ?? "")).toEqual([]);
    expect(await providersOf(user?.id ?? "")).toEqual(["line"]);
    // The pending password is gone with it: nobody can sign in with it.
    const attackerSignIn = await testBrowser().postJson("/api/auth/sign-in/email", { email, password: TEST_PASSWORD });
    expect(attackerSignIn.status).toBe(401);
  });

  it("gives a LINE user without an email a separate LINE-only account", async () => {
    const profile = newLineProfile();

    const { callback, user } = await signInWithLine(internet, profile);

    expect(callback.status).toBe(302);
    expect(user?.email).toBe(`line_${profile.sub.toLowerCase()}@line.invalid`);
    expect(await providersOf(user?.id ?? "")).toEqual(["line"]);
  });

  it("lands in the same account on every later LINE sign-in", async () => {
    const withEmail = newLineProfile({ email: newTestEmail("line") });
    const withoutEmail = newLineProfile();

    for (const profile of [withEmail, withoutEmail]) {
      const first = await signInWithLine(internet, profile);
      const second = await signInWithLine(internet, profile);
      expect(first.user).not.toBeNull();
      expect(second.user?.id).toBe(first.user?.id);
    }
  });
});

describe("forgot password for a LINE account", () => {
  it("lets a LINE user with an email set a password for the same account", async () => {
    const email = newTestEmail("line");
    const { user } = await signInWithLine(internet, newLineProfile({ email }));
    await testBrowser().postJson("/api/auth/request-password-reset", { email }, PASSES_TURNSTILE);
    const token = new URL(internet.linkInLastEmailTo(email)).searchParams.get("token");
    await testBrowser().postJson("/api/auth/reset-password", { token, newPassword: TEST_PASSWORD });

    const signIn = await testBrowser().postJson("/api/auth/sign-in/email", { email, password: TEST_PASSWORD });

    expect(signIn.status).toBe(200);
    expect((await signIn.json<{ user: { id: string } }>()).user.id).toBe(user?.id);
  });

  it("never emails the placeholder address of a LINE-only account", async () => {
    const { user } = await signInWithLine(internet, newLineProfile());

    await testBrowser().postJson("/api/auth/request-password-reset", { email: user?.email }, PASSES_TURNSTILE);

    expect(internet.sentEmails).toHaveLength(0);
  });
});
