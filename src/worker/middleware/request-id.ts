import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

/** Gives each request an id, returned as X-Request-Id and used in logs. */
export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const id = crypto.randomUUID();
  c.set("requestId", id);
  c.header("X-Request-Id", id);
  await next();
});
