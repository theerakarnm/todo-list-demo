import { Hono } from "hono";
import { updateSettingsSchema } from "../../shared/schemas/settings";
import { updateUserSettings } from "../db/user-settings";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";
import { validate } from "../validate";

/** Settings → General and Account: theme, start page, week start, time zone, display name, digest. */
export const settingsRoutes = new Hono<SessionEnv>()
  .use(requireSession)
  .patch("/", validate("json", updateSettingsSchema), async (c) => {
    const settings = await updateUserSettings(c.env.DB, c.var.user.id, c.req.valid("json"));
    return c.json({ settings });
  });
