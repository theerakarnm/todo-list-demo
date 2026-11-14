import { Hono } from "hono";
import { pushSubscriptionSchema, pushUnsubscribeSchema } from "../../shared/schemas/push";
import { createDb } from "../db/client";
import { deleteOwnPushSubscription, savePushSubscription } from "../db/push-subscriptions";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";
import { validate } from "../validate";

/** Settings → Notifications: register or remove this browser for reminders. */
export const pushRoutes = new Hono<SessionEnv>()
  .use(requireSession)

  // The browser needs it to subscribe. Public by design; the private key never leaves the server.
  .get("/public-key", (c) => c.json({ publicKey: c.env.VAPID_PUBLIC_KEY ?? "" }))

  .post("/subscribe", validate("json", pushSubscriptionSchema), async (c) => {
    await savePushSubscription(createDb(c.env.DB), c.get("userId"), c.req.valid("json"));
    return c.body(null, 204);
  })

  .delete("/subscribe", validate("json", pushUnsubscribeSchema), async (c) => {
    await deleteOwnPushSubscription(createDb(c.env.DB), c.get("userId"), c.req.valid("json").endpoint);
    return c.body(null, 204);
  });
