import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth/create-auth";
import { ApiError } from "../errors";
import type { SessionEnv } from "../types";
import { enforceApiRateLimit } from "./rate-limit";

/**
 * Lets only signed-in users through and puts them on `c.var.user`, `c.var.userId` and `c.var.session`.
 * Every route under /api except auth, health and config sits behind it.
 * Every request it lets through counts against the user's API rate limit.
 */
export const requireSession = createMiddleware<SessionEnv>(async (c, next) => {
  const signedIn = await createAuth(c.env, c.req.raw).api.getSession({ headers: c.req.raw.headers });
  if (!signedIn) throw new ApiError("UNAUTHORIZED");
  await enforceApiRateLimit(c.env, signedIn.user.id);

  c.set("user", signedIn.user);
  c.set("userId", signedIn.user.id);
  c.set("session", signedIn.session);
  await next();
});
