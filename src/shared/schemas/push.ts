import { z } from "zod";

/** Base64url text of exactly `length` characters, as PushSubscription.toJSON() gives keys. */
const base64UrlOfLength = (length: number) => z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${length}}$`));

const endpointSchema = z.url({ protocol: /^https$/ }).max(2048);

/** Body of `POST /api/push/subscribe`: the browser's PushSubscription.toJSON(). */
export const pushSubscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    // An uncompressed P-256 point: 65 bytes, always starting with 0x04 ("B" in base64url).
    p256dh: base64UrlOfLength(87).startsWith("B"),
    // The 16-byte auth secret.
    auth: base64UrlOfLength(22),
  }),
});

/** Body of `DELETE /api/push/subscribe`. */
export const pushUnsubscribeSchema = z.object({ endpoint: endpointSchema });

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
