import { env } from "cloudflare:test";
import { makeSignature } from "better-auth/crypto";
import { createAuth } from "../auth/create-auth";
import { createDb } from "../db/client";
import { user } from "../db/schema";
import { DEFAULT_TIMEZONE } from "../db/user-settings";
import { newTestEmail } from "./sign-up-user";
import { TEST_ORIGIN } from "./test-browser";

/** The session cookie of each user createTestUser signed in, for apiAs. */
const sessionCookies = new Map<string, string>();

/**
 * Adds a verified user and signs them in with a real Better Auth session in the
 * local D1, so each test works on its own data. Like any first sign-in, the
 * session creates the user's settings row, here with `timezone`.
 */
export async function createTestUser({ timezone = DEFAULT_TIMEZONE } = {}) {
  const request = new Request(TEST_ORIGIN, { headers: { "x-timezone": timezone } });
  const auth = await createAuth(env, request).$context;
  const id = `test-user-${crypto.randomUUID()}`;
  await createDb(env.DB).insert(user).values({ id, name: "ผู้ทดสอบ", email: newTestEmail(), emailVerified: true });
  const { token } = await auth.internalAdapter.createSession(id);

  // Signed the way Better Auth signs its own session cookie.
  const signedToken = `${token}.${await makeSignature(token, auth.secret)}`;
  sessionCookies.set(id, `${auth.authCookies.sessionToken.name}=${encodeURIComponent(signedToken)}`);
  return id;
}

/** The Cookie header of a user made by createTestUser. */
export function sessionCookieOf(userId: string) {
  const cookie = sessionCookies.get(userId);
  if (!cookie) throw new Error(`${userId} was not made by createTestUser`);
  return cookie;
}
