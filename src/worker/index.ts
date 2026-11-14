import { app } from "./app";
import { handleScheduled } from "./cron";

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
} satisfies ExportedHandler<Env>;
