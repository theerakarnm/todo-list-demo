import { Hono } from "hono";
import type { AppEnv } from "../types";

/** Public settings the client needs before sign-in. Only public values belong here. */
export const configRoutes = new Hono<AppEnv>().get("/", (c) =>
  c.json({ turnstileSiteKey: c.env.TURNSTILE_SITE_KEY ?? "" }),
);
