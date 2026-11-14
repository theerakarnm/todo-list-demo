import { createMiddleware } from "hono/factory";
import { isLinePlaceholderEmail } from "../auth/line-linking";
import { findSignInMethods } from "../auth/user-queries";
import { ApiError } from "../errors";
import type { AppEnv } from "../types";

/**
 * Email sign-up for a LINE placeholder address answers 400, so nobody can
 * pre-claim the email of a LINE-only user.
 * Email sign-up for an address that already has an account answers 409:
 * EMAIL_TAKEN when it has a password (verified or still pending), or
 * EMAIL_TAKEN_LINE when it only signs in with LINE. Better Auth on its own
 * would answer a silent success here.
 */
export const rejectTakenEmail = createMiddleware<AppEnv>(async (c, next) => {
  const body = await c.req.raw
    .clone()
    .json<{ email?: unknown }>()
    .catch(() => ({ email: undefined }));
  // Better Auth itself answers a missing or malformed email.
  if (typeof body.email !== "string") return next();
  if (isLinePlaceholderEmail(body.email)) throw new ApiError("VALIDATION_ERROR");

  const signInMethods = await findSignInMethods(c.env.DB, body.email);
  if (signInMethods?.includes("credential")) throw new ApiError("EMAIL_TAKEN");
  if (signInMethods) throw new ApiError("EMAIL_TAKEN_LINE");

  await next();
});
