import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { userSettings } from "./schema";

/** The user's settings that views and due dates depend on. */
export async function getViewSettings(db: Db, userId: string) {
  const settings = await db
    .select({ timezone: userSettings.timezone, weekStart: userSettings.weekStart })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();
  // Sign-up always creates the settings row, so a missing one is a bug.
  if (!settings) throw new Error("user_settings row missing");
  return settings;
}
