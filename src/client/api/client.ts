import { hc } from "hono/client";
import type { AppType } from "../../worker/app";

/**
 * Typed API client: routes, params and responses come from the Hono app
 * (src/worker/app.ts), so a server change that breaks the UI fails type-check.
 * Usage: `await api.api.health.$get()`.
 */
export const api = hc<AppType>("/");
