import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { PushSubscriptionInput } from "../../shared/schemas/push";
import type { Db } from "./client";
import { pushSubscriptions } from "./schema";

/**
 * Saves a browser's subscription for the user. An endpoint belongs to one
 * browser, so subscribing again updates the row, and a different user
 * signing in on that browser takes it over.
 */
export async function savePushSubscription(db: Db, userId: string, { endpoint, keys }: PushSubscriptionInput) {
  const owned = { userId, p256dh: keys.p256dh, auth: keys.auth };
  await db
    .insert(pushSubscriptions)
    .values({ id: uuidv7(), endpoint, createdAt: Date.now(), ...owned })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: owned });
}

/** Removes the user's subscription for this endpoint; someone else's is left alone. */
export async function deleteOwnPushSubscription(db: Db, userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));
}
