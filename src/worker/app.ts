import { Hono } from "hono";
import { authRoutes } from "./auth/auth-routes";
import { handleError, handleNotFound } from "./errors";
import { requestId } from "./middleware/request-id";
import { securityHeaders } from "./middleware/security-headers";
import { healthRoutes } from "./routes/health";
import type { AppEnv } from "./types";

// Only /api/* reaches the Worker; everything else is a static asset (see wrangler.jsonc).
export const app = new Hono<AppEnv>()
  .use(requestId)
  .use(securityHeaders)
  .route("/api/health", healthRoutes)
  .route("/api/auth", authRoutes);

app.notFound(handleNotFound);
app.onError(handleError);

/** Used by the Hono RPC client (`hc<AppType>`) for end-to-end types. */
export type AppType = typeof app;
