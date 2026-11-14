import { encryptPayload } from "./encrypt";
import { type Vapid, vapidAuthorization } from "./vapid";

/** One browser's push subscription, as stored in push_subscriptions. */
export type PushTarget = { endpoint: string; p256dh: string; auth: string };

/** How long the push service keeps a message for an offline device. A reminder older than this is stale. */
const TTL_SECONDS = 12 * 60 * 60;

/**
 * Sends one encrypted Web Push message. An HTTP error from the push service
 * (e.g. 410 Gone) comes back as the status, never as an exception, so the
 * caller decides what it means. Only a network failure throws.
 */
export async function sendPush(target: PushTarget, payloadJson: string, vapid: Vapid) {
  const body = await encryptPayload(new TextEncoder().encode(payloadJson), target);
  const response = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(target.endpoint, vapid, Date.now()),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(TTL_SECONDS),
      // Reminders are due now, so ask the push service to deliver them right away.
      Urgency: "high",
    },
    body,
  });
  return { status: response.status };
}
