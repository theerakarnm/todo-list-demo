import type { Context } from "hono";

/** The visitor's IP as Cloudflare saw it. Missing only outside Cloudflare, e.g. in tests. */
export function clientIp(c: Context) {
  return c.req.header("CF-Connecting-IP");
}
