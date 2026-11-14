import { Hono } from "hono";
import { authRoutes } from "./auth/auth-routes";
import { handleError, handleNotFound } from "./errors";
import { requestId } from "./middleware/request-id";
import { securityHeaders } from "./middleware/security-headers";
import { configRoutes } from "./routes/config";
import { healthRoutes } from "./routes/health";
import { meRoutes } from "./routes/me";
import { settingsRoutes } from "./routes/settings";
import type { AppEnv } from "./types";

// Only /api/* reaches the Worker; everything else is a static asset (see wrangler.jsonc).
export const app = new Hono<AppEnv>()
  .use(requestId)
  .use(securityHeaders)
  .route("/api/health", healthRoutes)
  .route("/api/config", configRoutes)
  .route("/api/auth", authRoutes)
  .route("/api/me", meRoutes)
  .route("/api/settings", settingsRoutes);

app.notFound(handleNotFound);
app.onError(handleError);

/** Used by the Hono RPC client (`hc<AppType>`) for end-to-end types. */
export type AppType = typeof app;
