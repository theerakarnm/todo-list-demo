import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newTestEmail, PASSES_TURNSTILE, signUpVerifiedUser, TEST_PASSWORD } from "../test/sign-up-user";
import { type TestBrowser, testBrowser } from "../test/test-browser";

const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";

type LineProfile = { sub: string; name: string; picture?: string; email?: string };

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function base64Url(value: object) {
  const utf8Bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...utf8Bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/** The id_token LINE's token endpoint returns. Better Auth reads its claims; the signature is not checked. */
function lineIdToken(profile: LineProfile) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: "https://access.line.me", aud: "test-line-channel-id", iat: now, exp: now + 3600, ...profile };
  return `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url(claims)}.signature`;
}

function newLineProfile(overrides: Partial<LineProfile> = {}): LineProfile {
  return { sub: `U${crypto.randomUUID().replaceAll("-", "")}`, name: "สมชาย LINE", ...overrides };
}

/**
 * Signs in with LINE the way a browser does: start at /sign-in/social, then come
 * back to the OAuth callback with LINE's code and the state. LINE's token
 * endpoint is faked to return this profile.
 */
async function signInWithLine(profile: LineProfile, browser: TestBrowser = testBrowser()) {
  internet.on(LINE_TOKEN_URL, () =>
    Response.json({
      access_token: "line-access-token",
      token_type: "Bearer",
      expires_in: 2592000,
      scope: "openid profile email",
      id_token: lineIdToken(profile),
    }),
  );
  const start = await browser.postJson("/api/auth/sign-in/social", { provider: "line", callbackURL: "/today" });
  const authorizeUrl = new URL((await start.json<{ url: string }>()).url);
  const state = authorizeUrl.searchParams.get("state") ?? "";

  const callback = await browser.request(`/api/auth/callback/line?code=line-code&state=${encodeURIComponent(state)}`);
  const session = await (await browser.request("/api/auth/get-session")).json<{
    user: { id: string; email: string; emailVerified: boolean; name: string; image: string | null };
  } | null>();
  return { callback, authorizeUrl, user: session?.user ?? null, browser };
}

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

    const { callback, user } = await signInWithLine(newLineProfile({ email, picture: "https://profile.line-scdn.net/p" }));

    expect(callback.status).toBe(302);
    expect(callback.headers.get("Location")).toBe("/today");
    expect(user).toMatchObject({ email, emailVerified: true, name: "สมชาย LINE", image: "https://profile.line-scdn.net/p" });
  });

  it("signs in to the verified email account with the same email, linking LINE to it", async () => {
    const email = newTestEmail();
    const emailBrowser = await signUpVerifiedUser(internet, email);
    const emailUser = await (await emailBrowser.request("/api/auth/get-session")).json<{ user: { id: string } }>();

    const { user } = await signInWithLine(newLineProfile({ email }));

    expect(user?.id).toBe(emailUser.user.id);
    expect(await providersOf(emailUser.user.id)).toEqual(["credential", "line"]);
    expect(await userCount(email)).toBe(1);
  });

  it("replaces an unverified pending sign-up with the same email by the LINE account", async () => {
    const email = newTestEmail();
    await testBrowser().postJson("/api/auth/sign-up/email", { name: "attacker", email, password: TEST_PASSWORD }, PASSES_TURNSTILE);
    const pending = await env.DB.prepare("SELECT id FROM user WHERE email = ?").bind(email).first<{ id: string }>();

    const { user } = await signInWithLine(newLineProfile({ email }));

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

    const { callback, user } = await signInWithLine(profile);

    expect(callback.status).toBe(302);
    expect(user?.email).toBe(`line_${profile.sub.toLowerCase()}@line.invalid`);
    expect(await providersOf(user?.id ?? "")).toEqual(["line"]);
  });

  it("lands in the same account on every later LINE sign-in", async () => {
    const withEmail = newLineProfile({ email: newTestEmail("line") });
    const withoutEmail = newLineProfile();

    for (const profile of [withEmail, withoutEmail]) {
      const first = await signInWithLine(profile);
      const second = await signInWithLine(profile);
      expect(first.user).not.toBeNull();
      expect(second.user?.id).toBe(first.user?.id);
    }
  });
});

describe("forgot password for a LINE account", () => {
  it("lets a LINE user with an email set a password for the same account", async () => {
    const email = newTestEmail("line");
    const { user } = await signInWithLine(newLineProfile({ email }));
    await testBrowser().postJson("/api/auth/request-password-reset", { email }, PASSES_TURNSTILE);
    const token = new URL(internet.linkInLastEmailTo(email)).searchParams.get("token");
    await testBrowser().postJson("/api/auth/reset-password", { token, newPassword: TEST_PASSWORD });

    const signIn = await testBrowser().postJson("/api/auth/sign-in/email", { email, password: TEST_PASSWORD });

    expect(signIn.status).toBe(200);
    expect((await signIn.json<{ user: { id: string } }>()).user.id).toBe(user?.id);
  });

  it("never emails the placeholder address of a LINE-only account", async () => {
    const { user } = await signInWithLine(newLineProfile());

    await testBrowser().postJson("/api/auth/request-password-reset", { email: user?.email }, PASSES_TURNSTILE);

    expect(internet.sentEmails).toHaveLength(0);
  });
});
