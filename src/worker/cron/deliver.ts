import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { inJsonList } from "../db/in-list";
import { pushSubscriptions } from "../db/schema";
import { type PushTarget, sendPush } from "../push/send-push";
import type { Vapid } from "../push/vapid";

/** What the service worker shows: the notification text, the page a tap opens, and a tag so a resend replaces it. */
export type PushPayload = { title: string; body: string; url: string; tag: string };

export type Subscription = PushTarget & { id: string; userId: string };

export type DeliveryCounts = { sent: number; failed: number; expired: number };

/** The push service says this subscription is gone for good (RFC 8030 section 7.3). */
const isExpired = (status: number) => status === 404 || status === 410;

/** Every push subscription of these users, by user id (any number of ids: they travel as one JSON parameter). */
export async function subscriptionsByUser(db: Db, userIds: string[]) {
  const rows = await db
    .select({
      id: pushSubscriptions.id,
      userId: pushSubscriptions.userId,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(inJsonList(pushSubscriptions.userId, userIds));
  const byUser = new Map<string, Subscription[]>();
  for (const row of rows) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row]);
  return byUser;
}

async function statusOf(subscription: Subscription, payload: PushPayload, vapid: Vapid) {
  try {
    return (await sendPush(subscription, JSON.stringify(payload), vapid)).status;
  } catch {
    // A network failure counts like a failed status; one bad push never stops the batch.
    return 0;
  }
}

/** Sends each payload to its subscription and deletes the subscriptions the push service reports as gone. */
export async function deliver(db: Db, vapid: Vapid, pushes: { subscription: Subscription; payload: PushPayload }[]) {
  const counts: DeliveryCounts = { sent: 0, failed: 0, expired: 0 };
  const statuses = await Promise.all(
    pushes.map(async ({ subscription, payload }) => ({
      subscription,
      status: await statusOf(subscription, payload, vapid),
    })),
  );
  for (const { subscription, status } of statuses) {
    if (status >= 200 && status < 300) counts.sent++;
    else if (isExpired(status)) {
      counts.expired++;
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
    } else counts.failed++;
  }
  return counts;
}
