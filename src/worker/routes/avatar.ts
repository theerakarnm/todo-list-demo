import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb, type Db } from "../db/client";
import { userSettings } from "../db/schema";
import { newAvatarFileKey } from "../files/file-keys";
import { assertImageFile, imageBodyLimit, uploadAvatarSchema } from "../files/uploads";
import type { SessionEnv } from "../types";
import { validate } from "../validate";

async function findAvatarKey(db: Db, userId: string) {
  const row = await db
    .select({ avatarKey: userSettings.avatarKey })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();
  return row?.avatarKey ?? null;
}

function saveAvatarKey(db: Db, userId: string, avatarKey: string | null) {
  return db.update(userSettings).set({ avatarKey }).where(eq(userSettings.userId, userId));
}

// Mounted inside meRoutes, whose requireSession already checks the session and the rate limit.
// The profile photo does not count toward the 200 MB of images (ARCHITECTURE.md §16).
export const avatarRoutes = new Hono<SessionEnv>()

  // The new photo is stored before the old one is deleted, so a failure never leaves the user without one.
  .put("/", imageBodyLimit, validate("form", uploadAvatarSchema), async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const { file } = c.req.valid("form");
    const mime = await assertImageFile(file);

    const avatarKey = newAvatarFileKey(userId);
    await c.env.FILES.put(avatarKey, file, { httpMetadata: { contentType: mime } });
    const previousKey = await findAvatarKey(db, userId);
    await saveAvatarKey(db, userId, avatarKey);
    if (previousKey) await c.env.FILES.delete(previousKey);
    return c.json({ avatarKey }, 200);
  })

  .delete("/", async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get("userId");
    const previousKey = await findAvatarKey(db, userId);
    await saveAvatarKey(db, userId, null);
    if (previousKey) await c.env.FILES.delete(previousKey);
    return c.json({ avatarKey: null }, 200);
  });
