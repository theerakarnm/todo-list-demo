import { createMiddleware } from "hono/factory";
import { ApiError } from "../errors";
import type { AppEnv } from "../types";

/** 120 API requests a minute per user (RATE_LIMIT_API in wrangler.jsonc). Runs after currentUser. */
export const apiRateLimit = createMiddleware<AppEnv>(async (c, next) => {
  const { success } = await c.env.RATE_LIMIT_API.limit({ key: c.get("userId") });
  if (!success) throw new ApiError("RATE_LIMITED");
  await next();
});
