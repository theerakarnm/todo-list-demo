import { Hono } from "hono";
import { handleError, handleNotFound } from "./errors";
import { requestId } from "./middleware/request-id";
import { securityHeaders } from "./middleware/security-headers";
import { healthRoutes } from "./routes/health";
import { logbookRoutes } from "./routes/logbook";
import { projectRoutes } from "./routes/projects";
import { subtaskRoutes } from "./routes/subtasks";
import { syncRoutes } from "./routes/sync";
import { taskRoutes } from "./routes/tasks";
import type { AppEnv } from "./types";

// Only /api/* reaches the Worker; everything else is a static asset (see wrangler.jsonc).
export const app = new Hono<AppEnv>()
  .use(requestId)
  .use(securityHeaders)
  .route("/api/health", healthRoutes)
  .route("/api/tasks", taskRoutes)
  .route("/api/projects", projectRoutes)
  .route("/api/subtasks", subtaskRoutes)
  .route("/api/sync", syncRoutes)
  .route("/api/logbook", logbookRoutes);

app.notFound(handleNotFound);
app.onError(handleError);

/** Used by the Hono RPC client (`hc<AppType>`) for end-to-end types. */
export type AppType = typeof app;
