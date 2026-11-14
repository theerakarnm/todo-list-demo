/** Runs every minute (wrangler.jsonc triggers). Reminders and digests come later. */
export async function handleScheduled(controller: ScheduledController) {
  console.log(
    JSON.stringify({
      level: "info",
      event: "cron",
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
    }),
  );
}
