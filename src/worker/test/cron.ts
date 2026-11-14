import { createScheduledController, env } from "cloudflare:test";
import worker from "../index";

/** Runs the Worker's scheduled handler once, the way the 1-minute Cron Trigger does, with its clock at `scheduledTime`. */
export function runCronAt(scheduledTime: number) {
  return worker.scheduled(createScheduledController({ scheduledTime, cron: "* * * * *" }), env);
}
