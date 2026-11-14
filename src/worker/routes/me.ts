import { Hono } from "hono";
import { isLinePlaceholderEmail } from "../auth/line-linking";
import { findProvidersOfUser } from "../auth/user-queries";
import { findUserSettings } from "../db/user-settings";
import { ApiError } from "../errors";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";

/** The signed-in user and their settings: what the client needs on first load. */
export const meRoutes = new Hono<SessionEnv>().use(requireSession).get("/", async (c) => {
  const { id, name, email, image } = c.var.user;
  const [providers, settings] = await Promise.all([
    findProvidersOfUser(c.env.DB, id),
    findUserSettings(c.env.DB, id),
  ]);
  if (!settings) throw new ApiError("NOT_FOUND");

  return c.json({
    user: {
      id,
      name,
      email: isLinePlaceholderEmail(email) ? null : email,
      image: image ?? null,
      hasPassword: providers.includes("credential"),
      hasLine: providers.includes("line"),
    },
    settings,
  });
});
