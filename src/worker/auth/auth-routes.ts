import { Hono } from "hono";
import type { AppEnv } from "../types";
import { createAuth } from "./create-auth";

/** Better Auth answers everything under /api/auth/*. */
export const authRoutes = new Hono<AppEnv>().on(["GET", "POST"], "/*", (c) =>
  createAuth(c.env, c.req.raw).handler(c.req.raw),
);
