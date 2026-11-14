import { and, eq, isNull, lt, lte, or, sql } from "drizzle-orm";
import { timeInTimeZone, todayInTimeZone } from "../../shared/time-zone";
import type { Db } from "../db/client";
import { tasks, userSettings } from "../db/schema";
import type { Vapid } from "../push/vapid";
import { deliver, type PushPayload, subscriptionsByUser } from "./deliver";
import { DIGEST_TITLE, digestBody } from "./messages";

type DigestUser = { userId: string; today: string };

/** Users with the digest on whose local time has reached digest_time and who have not had today's digest. */
async function usersDueForDigest(db: Db, now: number) {
  const candidates = await db
    .select({
      userId: userSettings.userId,
      timezone: userSettings.timezone,
      digestTime: userSettings.digestTime,
      digestSentOn: userSettings.digestSentOn,
    })
    .from(userSettings)
    .where(eq(userSettings.digestEnabled, true));
  return candidates.flatMap(({ userId, timezone, digestTime, digestSentOn }): DigestUser[] => {
    const today = todayInTimeZone(now, timezone);
    const reached = timeInTimeZone(now, timezone) >= digestTime;
    return reached && (!digestSentOn || digestSentOn < today) ? [{ userId, today }] : [];
  });
}

/** Sets digest_sent_on before sending, so an overlapping run that loses the race sends nothing. */
async function claimDigest(db: Db, { userId, today }: DigestUser) {
  const claimed = await db
    .update(userSettings)
    .set({ digestSentOn: today })
    .where(
      and(
        eq(userSettings.userId, userId),
        or(isNull(userSettings.digestSentOn), lt(userSettings.digestSentOn, today)),
      ),
    )
    .returning({ userId: userSettings.userId });
  return claimed.length > 0;
}

/** How many of the user's active tasks are due today and how many are overdue. */
async function todayCounts(db: Db, { userId, today }: DigestUser) {
  const counts = await db
    .select({
      dueToday: sql<number>`count(*) FILTER (WHERE ${tasks.dueDate} = ${today})`,
      overdue: sql<number>`count(*) FILTER (WHERE ${tasks.dueDate} < ${today})`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        lte(tasks.dueDate, today),
        isNull(tasks.completedAt),
        isNull(tasks.deletedAt),
      ),
    )
    .get();
  return { dueToday: counts?.dueToday ?? 0, overdue: counts?.overdue ?? 0 };
}

/** Sends each due user one morning summary, unless nothing is due or overdue. */
export async function sendDigests(db: Db, vapid: Vapid, now: number) {
  const digests: { userId: string; payload: PushPayload }[] = [];
  for (const user of await usersDueForDigest(db, now)) {
    if (!(await claimDigest(db, user))) continue;
    const { dueToday, overdue } = await todayCounts(db, user);
    if (dueToday === 0 && overdue === 0) continue;
    digests.push({
      userId: user.userId,
      payload: { title: DIGEST_TITLE, body: digestBody(dueToday, overdue), url: "/today", tag: "digest" },
    });
  }
  if (digests.length === 0) return { digests: 0, sent: 0, failed: 0, expired: 0 };

  const subscriptions = await subscriptionsByUser(db, digests.map((digest) => digest.userId));
  const pushes = digests.flatMap(({ userId, payload }) =>
    (subscriptions.get(userId) ?? []).map((subscription) => ({ subscription, payload })),
  );
  return { digests: digests.length, ...(await deliver(db, vapid, pushes)) };
}
