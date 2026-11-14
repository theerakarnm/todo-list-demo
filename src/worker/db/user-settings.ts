import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { LIMITS } from "../../shared/constants";
import type { UpdateSettingsInput } from "../../shared/schemas/settings";
import { user, userSettings } from "./schema";

/** Until the browser sends its own (at sign-up or onboarding). */
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

type SettingsOwner = { id: string; name: string; email: string };

/** Creates the user's settings row unless it already exists. */
export async function ensureUserSettings(db: D1Database, owner: SettingsOwner, timezone = DEFAULT_TIMEZONE) {
  await drizzle(db)
    .insert(userSettings)
    .values({ userId: owner.id, displayName: initialDisplayName(owner.name, owner.email), timezone })
    .onConflictDoNothing();
}

/** Runs on every sign-in; only the first one creates the row, with the browser's time zone when known. */
export async function createUserSettingsOnce(db: D1Database, userId: string, timezone = DEFAULT_TIMEZONE) {
  const [owner] = await drizzle(db)
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId));
  if (owner) await ensureUserSettings(db, owner, timezone);
}

export async function findUserSettings(db: D1Database, userId: string) {
  const [settings] = await drizzle(db).select(settingsColumns).from(userSettings).where(eq(userSettings.userId, userId));
  return settings ?? null;
}

export async function updateUserSettings(db: D1Database, userId: string, changes: UpdateSettingsInput) {
  if (Object.keys(changes).length > 0) {
    await drizzle(db).update(userSettings).set(changes).where(eq(userSettings.userId, userId));
  }
  return findUserSettings(db, userId);
}
