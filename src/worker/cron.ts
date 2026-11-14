import { createDb } from "./db/client";
import { sendDigests } from "./cron/digests";
import { sendDueReminders } from "./cron/reminders";
import { vapidFrom } from "./push/vapid";

type Counts = Record<string, number>;

/**
 * Runs one job and writes one JSON line for Workers Logs: counts only, never
 * endpoints, keys, task text, emails or user ids. A failing job is logged and
 * the next one still runs.
 */
async function runJob(job: string, work: () => Promise<Counts>) {
  try {
    console.log(JSON.stringify({ level: "info", event: "cron", job, ...(await work()) }));
  } catch (error) {
    // Only the error's name: a D1 message can quote the values in the statement.
    const name = error instanceof Error ? error.name : "unknown";
    console.error(JSON.stringify({ level: "error", event: "cron", job, error: name }));
  }
}

/**
 * Runs every minute (wrangler.jsonc triggers). The clock is the trigger's
 * scheduledTime, so a late or retried run still acts for its own minute.
 */
export async function handleScheduled(controller: ScheduledController, env: Env) {
  const now = controller.scheduledTime;
  const db = createDb(env.DB);
  const vapid = vapidFrom(env);
  if (vapid) {
    await runJob("reminders", () => sendDueReminders(db, vapid, now));
    await runJob("digests", () => sendDigests(db, vapid, now));
  } else {
    // Without the keys nothing can be sent; reminders and digests stay unclaimed until they are set.
    console.warn(JSON.stringify({ level: "warn", event: "cron", job: "push", skipped: "no VAPID keys" }));
  }
}
