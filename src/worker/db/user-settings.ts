import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { LIMITS } from "../../shared/constants";
import { user, userSettings } from "./schema";

/** Until the browser sends its own (at onboarding). */
export const DEFAULT_TIMEZONE = "Asia/Bangkok";

/** The settings the client sees; `userId` and the digest bookkeeping stay on the server. */
const settingsColumns = {
  displayName: userSettings.displayName,
  avatarKey: userSettings.avatarKey,
  timezone: userSettings.timezone,
  theme: userSettings.theme,
  startPage: userSettings.startPage,
  weekStart: userSettings.weekStart,
  digestEnabled: userSettings.digestEnabled,
  digestTime: userSettings.digestTime,
  onboardedAt: userSettings.onboardedAt,
};

/** The LINE name, or the part of the email before the "@". */
function initialDisplayName(name: string, email: string) {
  const displayName = name.trim() || email.split("@")[0] || email;
  return displayName.slice(0, LIMITS.displayNameLength);
}

/** Runs on every sign-in; only the first one creates the row. */
export async function createUserSettingsOnce(db: D1Database, userId: string) {
  const orm = drizzle(db);
  const [owner] = await orm.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, userId));
  if (!owner) return;

  await orm
    .insert(userSettings)
    .values({ userId, displayName: initialDisplayName(owner.name, owner.email), timezone: DEFAULT_TIMEZONE })
    .onConflictDoNothing();
}

export async function findUserSettings(db: D1Database, userId: string) {
  const [settings] = await drizzle(db).select(settingsColumns).from(userSettings).where(eq(userSettings.userId, userId));
  return settings ?? null;
}
