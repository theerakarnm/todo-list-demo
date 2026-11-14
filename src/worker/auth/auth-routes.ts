import { Hono } from "hono";
import { requireTurnstile } from "../middleware/require-turnstile";
import type { AppEnv } from "../types";
import { createAuth } from "./create-auth";

/** Better Auth answers everything under /api/auth/*. Sign-up and forgot-password need Turnstile first. */
export const authRoutes = new Hono<AppEnv>()
  .use("/sign-up/email", requireTurnstile)
  .use("/request-password-reset", requireTurnstile)
  .on(["GET", "POST"], "/*", (c) => createAuth(c.env, c.req.raw).handler(c.req.raw));
