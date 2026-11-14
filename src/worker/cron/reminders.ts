import { and, inArray, isNull, lte } from "drizzle-orm";
import type { Db } from "../db/client";
import { inJsonList } from "../db/in-list";
import { projects, tasks } from "../db/schema";
import type { Vapid } from "../push/vapid";
import { deliver, type PushPayload, subscriptionsByUser } from "./deliver";
import { INBOX_NAME } from "./messages";

const BATCH_SIZE = 500;

/**
 * Claims up to 500 due reminders by setting reminder_sent_at, in one UPDATE.
 * Claiming comes before sending, so a crash or an overlapping run never sends
 * a reminder twice: a row another run already claimed no longer matches.
 */
function claimDueReminders(db: Db, now: number) {
  const due = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        lte(tasks.remindAt, now),
        isNull(tasks.reminderSentAt),
        isNull(tasks.completedAt),
        isNull(tasks.deletedAt),
      ),
    )
    .orderBy(tasks.remindAt)
    .limit(BATCH_SIZE);
  return db
    .update(tasks)
    .set({ reminderSentAt: now })
    .where(and(inArray(tasks.id, due), isNull(tasks.reminderSentAt)))
    .returning({ id: tasks.id, userId: tasks.userId, projectId: tasks.projectId, title: tasks.title });
}

async function projectNames(db: Db, projectIds: string[]) {
  const rows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(inJsonList(projects.id, projectIds));
  return new Map(rows.map((row) => [row.id, row.name]));
}

/** Sends every due reminder to each device of the task's owner. */
export async function sendDueReminders(db: Db, vapid: Vapid, now: number) {
  const claimed = await claimDueReminders(db, now);
  if (claimed.length === 0) return { reminders: 0, sent: 0, failed: 0, expired: 0 };

  const names = await projectNames(db, claimed.flatMap((task) => (task.projectId ? [task.projectId] : [])));
  const subscriptions = await subscriptionsByUser(db, [...new Set(claimed.map((task) => task.userId))]);

  const pushes = claimed.flatMap((task) => {
    const payload: PushPayload = {
      title: task.title,
      body: (task.projectId && names.get(task.projectId)) || INBOX_NAME,
      url: `/task/${task.id}`,
      tag: `task-${task.id}`,
    };
    return (subscriptions.get(task.userId) ?? []).map((subscription) => ({ subscription, payload }));
  });
  return { reminders: claimed.length, ...(await deliver(db, vapid, pushes)) };
}
