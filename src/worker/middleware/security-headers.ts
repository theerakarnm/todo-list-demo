import { createMiddleware } from "hono/factory";
import { SECURITY_HEADERS } from "../../shared/security-headers";
import type { AppEnv } from "../types";

export const securityHeaders = createMiddleware<AppEnv>(async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    c.res.headers.set(name, value);
  }
});
