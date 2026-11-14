import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { account, user } from "../db/schema";

/**
 * How the user with this email signs in: provider ids such as "credential"
 * (email + password) or "line". `null` when no user has this email.
 */
export async function findSignInMethods(db: D1Database, email: string) {
  const rows = await drizzle(db)
    .select({ providerId: account.providerId })
    .from(user)
    .leftJoin(account, eq(account.userId, user.id))
    .where(eq(user.email, email.toLowerCase()));
  if (rows.length === 0) return null;
  return rows.flatMap((row) => (row.providerId ? [row.providerId] : []));
}

/** The provider ids ("credential", "line") a user can sign in with. */
export async function findProvidersOfUser(db: D1Database, userId: string) {
  const rows = await drizzle(db).select({ providerId: account.providerId }).from(account).where(eq(account.userId, userId));
  return rows.map((row) => row.providerId);
}
