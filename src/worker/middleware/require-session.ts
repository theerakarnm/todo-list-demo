import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth/create-auth";
import { ApiError } from "../errors";
import type { SessionEnv } from "../types";

/** Lets only signed-in users through and puts them on `c.var.user` / `c.var.session`. */
export const requireSession = createMiddleware<SessionEnv>(async (c, next) => {
  const signedIn = await createAuth(c.env, c.req.raw).api.getSession({ headers: c.req.raw.headers });
  if (!signedIn) throw new ApiError("UNAUTHORIZED");

  c.set("user", signedIn.user);
  c.set("session", signedIn.session);
  await next();
});
