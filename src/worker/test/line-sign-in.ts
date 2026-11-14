import type { FakeInternet } from "./fake-internet";
import { type TestBrowser, testBrowser } from "./test-browser";

const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";

export type LineProfile = { sub: string; name: string; picture?: string; email?: string };

export type SignedInUser = { id: string; email: string; emailVerified: boolean; name: string; image: string | null };

function base64Url(value: object) {
  const utf8Bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...utf8Bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** The id_token LINE's token endpoint returns. Better Auth reads its claims; the signature is not checked. */
function lineIdToken(profile: LineProfile) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: "https://access.line.me", aud: "test-line-channel-id", iat: now, exp: now + 3600, ...profile };
  return `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url(claims)}.signature`;
}

export function newLineProfile(overrides: Partial<LineProfile> = {}): LineProfile {
  return { sub: `U${crypto.randomUUID().replaceAll("-", "")}`, name: "สมชาย LINE", ...overrides };
}

/**
 * Signs in with LINE the way a browser does: start at /sign-in/social, then come
 * back to the OAuth callback with LINE's code and the state. LINE's token
 * endpoint is faked to return this profile.
 */
export async function signInWithLine(internet: FakeInternet, profile: LineProfile, browser: TestBrowser = testBrowser()) {
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
  const session = await (await browser.request("/api/auth/get-session")).json<{ user: SignedInUser } | null>();
  return { callback, user: session?.user ?? null, browser };
}
