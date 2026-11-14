import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { createDb } from "../db/client";
import { user, userSettings } from "../db/schema";
import { ApiError } from "../errors";
import type { AppEnv } from "../types";

export const DEV_USER_ID = "dev-user";

/**
 * PLACEHOLDER until lane 1 (Better Auth) lands: lane 1 replaces this function
 * with the session lookup. It only works when APP_ENV is "development".
 * Without a header it signs you in as the fixed dev user; tests send
 * `x-dev-user-id` to act as another existing user.
 */
async function resolveUserId(c: Context<AppEnv>): Promise<string | null> {
  if (c.env.APP_ENV !== "development") return null;

  const db = createDb(c.env.DB);
  const requestedUserId = c.req.header("x-dev-user-id");
  if (requestedUserId) {
    const found = await db.select({ id: user.id }).from(user).where(eq(user.id, requestedUserId)).get();
    return found?.id ?? null;
  }

  await db
    .insert(user)
    .values({ id: DEV_USER_ID, name: "Dev", email: "dev@jotlist.test", emailVerified: true })
    .onConflictDoNothing();
  await db
    .insert(userSettings)
    .values({ userId: DEV_USER_ID, displayName: "Dev", timezone: "Asia/Bangkok" })
    .onConflictDoNothing();
  return DEV_USER_ID;
}

/** Sets `c.var.userId` for the signed-in user, or answers 401 UNAUTHORIZED. */
export const currentUser = createMiddleware<AppEnv>(async (c, next) => {
  const userId = await resolveUserId(c);
  if (!userId) throw new ApiError("UNAUTHORIZED");
  c.set("userId", userId);
  await next();
});
