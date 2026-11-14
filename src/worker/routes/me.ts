import { Hono } from "hono";
import { isLinePlaceholderEmail } from "../auth/line-linking";
import { CREDENTIAL_PROVIDER, LINE_PROVIDER } from "../auth/providers";
import { findProvidersOfUser } from "../auth/user-queries";
import { findUserSettings } from "../db/user-settings";
import { ApiError } from "../errors";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";
import { avatarRoutes } from "./avatar";

/** The signed-in user and their settings: what the client needs on first load. Also the profile photo routes. */
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
      hasPassword: providers.includes(CREDENTIAL_PROVIDER),
      hasLine: providers.includes(LINE_PROVIDER),
    },
    settings,
  });
}).route("/avatar", avatarRoutes);
