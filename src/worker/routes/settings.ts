import { Hono } from "hono";
import { updateSettingsSchema } from "../../shared/schemas/settings";
import { createDb } from "../db/client";
import { moveRemindersToTimeZone } from "../db/task-queries";
import { updateUserSettings } from "../db/user-settings";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";
import { validate } from "../validate";

/** Settings → General and Account: theme, start page, week start, time zone, display name, digest. */
export const settingsRoutes = new Hono<SessionEnv>()
  .use(requireSession)
  .patch("/", validate("json", updateSettingsSchema), async (c) => {
    const changes = c.req.valid("json");
    const settings = await updateUserSettings(c.env.DB, c.var.user.id, changes);
    // Due times are local wall-clock times, so their reminders follow the new zone.
    if (changes.timezone) await moveRemindersToTimeZone(createDb(c.env.DB), c.var.user.id, changes.timezone, Date.now());
    return c.json({ settings });
  });
