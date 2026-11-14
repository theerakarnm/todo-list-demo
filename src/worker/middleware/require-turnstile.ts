import { createMiddleware } from "hono/factory";
import { verifyTurnstile } from "../auth/turnstile";
import { ApiError } from "../errors";
import type { AppEnv } from "../types";

/** The client sends the Turnstile widget's token in this header. */
export const TURNSTILE_TOKEN_HEADER = "x-turnstile-token";

/** Lets the request through only with a Turnstile token that Cloudflare accepts. */
export const requireTurnstile = createMiddleware<AppEnv>(async (c, next) => {
  const secret = c.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY is not set: add it to .dev.vars locally or as a Worker secret");

  const token = c.req.header(TURNSTILE_TOKEN_HEADER);
  const ip = c.req.header("CF-Connecting-IP") ?? null;
  if (!token || !(await verifyTurnstile(secret, token, ip))) throw new ApiError("TURNSTILE_FAILED");

  await next();
});
