import { env } from "cloudflare:test";
import { createDb } from "../db/client";
import { user, userSettings } from "../db/schema";

/** Adds a user with settings, so each test works on its own data. */
export async function createTestUser({ timezone = "Asia/Bangkok" } = {}) {
  const id = `test-user-${crypto.randomUUID()}`;
  const db = createDb(env.DB);
  await db.insert(user).values({ id, name: "ผู้ทดสอบ", email: `${id}@jotlist.test` });
  await db.insert(userSettings).values({ userId: id, displayName: "ผู้ทดสอบ", timezone });
  return id;
}
