import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { createAuth } from "../auth/create-auth";
import { deleteUserRows } from "../db/delete-account";
import { deleteUserFiles } from "../files/delete-user-files";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";

/** Settings → Account → Delete account: everything goes now, then the user is signed out. */
export const accountRoutes = new Hono<SessionEnv>().use(requireSession).delete("/", async (c) => {
  const { id, email } = c.var.user;
  await deleteUserRows(c.env.DB, id, email);
  await deleteUserFiles(c.env.FILES, id);

  const { authCookies } = await createAuth(c.env, c.req.raw).$context;
  deleteCookie(c, authCookies.sessionToken.name, authCookies.sessionToken.attributes);
  return c.body(null, 204);
});
