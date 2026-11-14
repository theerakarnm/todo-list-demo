import { Hono } from "hono";
import { version } from "../../../package.json";
import type { AppEnv } from "../types";

async function isDatabaseReachable(db: D1Database) {
  try {
    await db.prepare("SELECT 1").first();
    return true;
  } catch {
    return false;
  }
}

export const healthRoutes = new Hono<AppEnv>().get("/", async (c) => {
  if (await isDatabaseReachable(c.env.DB)) {
    return c.json({ ok: true, version, db: "ok" } as const, 200);
  }
  return c.json({ ok: false, version, db: "error" } as const, 503);
});
