import { Hono } from "hono";
import { ApiError } from "../errors";
import { rateLimitAuthByIp } from "../middleware/rate-limit";
import { rejectTakenEmail } from "../middleware/reject-taken-email";
import { requireTurnstile } from "../middleware/require-turnstile";
import type { AppEnv } from "../types";
import { errorCodeForAuthResponse } from "./better-auth-errors";
import { createAuth } from "./create-auth";

/** Better Auth answers everything under /api/auth/*, with its errors in the app's shape. */
export const authRoutes = new Hono<AppEnv>()
  .use(rateLimitAuthByIp)
  .use("/sign-up/email", requireTurnstile, rejectTakenEmail)
  .use("/request-password-reset", requireTurnstile)
  .on(["GET", "POST"], "/*", async (c) => {
    const response = await createAuth(c.env, c.req.raw).handler(c.req.raw);
    if (response.status >= 400) throw new ApiError(await errorCodeForAuthResponse(response));
    return response;
  });
