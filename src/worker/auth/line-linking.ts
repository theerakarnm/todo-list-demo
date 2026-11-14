import type { LineIdTokenPayload, LineUserInfo } from "better-auth/social-providers";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { user, verification } from "../db/schema";

const PLACEHOLDER_DOMAIN = "line.invalid";

/**
 * `user.email` is required and unique, so a LINE user without an email gets a
 * placeholder address that can never receive mail. The app shows it as "no email".
 */
export function linePlaceholderEmail(lineUserId: string) {
  return `line_${lineUserId.toLowerCase()}@${PLACEHOLDER_DOMAIN}`;
}

export function isLinePlaceholderEmail(email: string) {
  return email.endsWith(`@${PLACEHOLDER_DOMAIN}`);
}

/**
 * An email sign-up that was never verified holds no data and cannot sign in.
 * When LINE proves it owns the same email, the pending sign-up is deleted so
 * nobody can pre-register someone else's email to take over their account.
 */
async function discardUnverifiedSignUp(db: D1Database, email: string) {
  const orm = drizzle(db);
  const [pending] = await orm
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.email, email.toLowerCase()), eq(user.emailVerified, false)));
  if (!pending) return;

  // Sessions and accounts go with the user (ON DELETE CASCADE); reset tokens hold the user id.
  await orm.batch([
    orm.delete(verification).where(eq(verification.value, pending.id)),
    orm.delete(user).where(eq(user.id, pending.id)),
  ]);
}

/**
 * Turns a LINE profile into the Better Auth user, applying the linking rules:
 * - LINE email of a verified account: Better Auth links LINE into that account.
 * - LINE email of an unverified pending sign-up: that sign-up is discarded and the LINE account owns the email.
 * - No email from LINE: a separate LINE-only account with a placeholder email.
 * LINE only shares an email that the user confirmed with LINE, so it counts as verified.
 */
export async function lineProfileToUser(db: D1Database, profile: LineIdTokenPayload | LineUserInfo) {
  if (!profile.email) return { email: linePlaceholderEmail(profile.sub), emailVerified: false };

  await discardUnverifiedSignUp(db, profile.email);
  return { email: profile.email, emailVerified: true };
}
