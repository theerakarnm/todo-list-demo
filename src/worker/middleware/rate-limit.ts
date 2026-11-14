import { createMiddleware } from "hono/factory";
import { ApiError } from "../errors";
import type { AppEnv } from "../types";

/**
 * Auth endpoints: 20 requests/min per IP (RATE_LIMIT_AUTH in wrangler.jsonc).
 * Keeps bots from burning the daily email quota or guessing passwords.
 */
export const rateLimitAuthByIp = createMiddleware<AppEnv>(async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const { success } = await c.env.RATE_LIMIT_AUTH.limit({ key: ip });
  if (!success) throw new ApiError("RATE_LIMITED");
  await next();
});

/** The rest of the API: 120 requests/min per signed-in user (RATE_LIMIT_API in wrangler.jsonc). */
export async function enforceApiRateLimit(env: Env, userId: string) {
  const { success } = await env.RATE_LIMIT_API.limit({ key: userId });
  if (!success) throw new ApiError("RATE_LIMITED");
}
