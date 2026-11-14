import { Hono } from "hono";
import { ApiError } from "../errors";
import { userFilesPrefix } from "../files/file-keys";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";

/** The browser may keep an image for an hour, but only for this user (never in a shared cache). */
const CACHE_CONTROL = "private, max-age=3600";

/**
 * The only way to read a file: the bucket is private. A key outside the user's
 * own prefix answers 404 like a missing one, so nobody can tell whether
 * someone else's key exists.
 */
export const fileRoutes = new Hono<SessionEnv>().use(requireSession).get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  if (!key.startsWith(userFilesPrefix(c.get("userId")))) throw new ApiError("NOT_FOUND");

  // With onlyIf, R2 leaves out the body when the browser's If-None-Match already matches.
  const object = await c.env.FILES.get(key, { onlyIf: c.req.raw.headers });
  if (!object) throw new ApiError("NOT_FOUND");

  const headers = new Headers({ ETag: object.httpEtag, "Cache-Control": CACHE_CONTROL });
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
});
