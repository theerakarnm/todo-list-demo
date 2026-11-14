import { createDb } from "./db/client";
import { sendDueReminders } from "./cron/reminders";
import { vapidFrom } from "./push/vapid";

/** One JSON line per job for Workers Logs: counts only, never endpoints, keys, task text, emails or user ids. */
function logJob(job: string, line: Record<string, number | string>) {
  console.log(JSON.stringify({ level: "info", event: "cron", job, ...line }));
}

/**
 * Runs every minute (wrangler.jsonc triggers). The clock is the trigger's
 * scheduledTime, so a late or retried run still acts for its own minute.
 */
export async function handleScheduled(controller: ScheduledController, env: Env) {
  const now = controller.scheduledTime;
  const db = createDb(env.DB);
  const vapid = vapidFrom(env);
  if (!vapid) {
    // Without the keys nothing can be sent; leave the reminders unclaimed for when they are set.
    logJob("reminders", { skipped: "no VAPID keys" });
    return;
  }
  logJob("reminders", await sendDueReminders(db, vapid, now));
}
