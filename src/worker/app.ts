import { Hono } from "hono";
import { authRoutes } from "./auth/auth-routes";
import { accountRoutes } from "./routes/account";
import { attachmentRoutes } from "./routes/attachments";
import { handleError, handleNotFound } from "./errors";
import { requestId } from "./middleware/request-id";
import { securityHeaders } from "./middleware/security-headers";
import { configRoutes } from "./routes/config";
import { fileRoutes } from "./routes/files";
import { healthRoutes } from "./routes/health";
import { meRoutes } from "./routes/me";
import { onboardingRoutes } from "./routes/onboarding";
import { settingsRoutes } from "./routes/settings";
import { logbookRoutes } from "./routes/logbook";
import { projectRoutes } from "./routes/projects";
import { searchRoutes } from "./routes/search";
import { subtaskRoutes } from "./routes/subtasks";
import { syncRoutes } from "./routes/sync";
import { taskRoutes } from "./routes/tasks";
import type { AppEnv } from "./types";

// Only /api/* reaches the Worker; everything else is a static asset (see wrangler.jsonc).
export const app = new Hono<AppEnv>()
  .use(requestId)
  .use(securityHeaders)
  .route("/api/health", healthRoutes)
  .route("/api/config", configRoutes)
  .route("/api/auth", authRoutes)
  .route("/api/me", meRoutes)
  .route("/api/settings", settingsRoutes)
  .route("/api/onboarding", onboardingRoutes)
  .route("/api/account", accountRoutes)
  .route("/api/tasks", taskRoutes)
  .route("/api/projects", projectRoutes)
  .route("/api/subtasks", subtaskRoutes)
  .route("/api/attachments", attachmentRoutes)
  .route("/api/sync", syncRoutes)
  .route("/api/logbook", logbookRoutes)
  .route("/api/files", fileRoutes)
  .route("/api/search", searchRoutes);

app.notFound(handleNotFound);
app.onError(handleError);

/** Used by the Hono RPC client (`hc<AppType>`) for end-to-end types. */
export type AppType = typeof app;
