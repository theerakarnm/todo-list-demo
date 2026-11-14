import { eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  account,
  attachments,
  projects,
  pushSubscriptions,
  session,
  subtasks,
  tasks,
  user,
  userSettings,
  verification,
} from "./schema";

/**
 * Hard-deletes the user and every row they own, in one D1 batch (one
 * transaction): either all of it is gone or none of it. Children go first.
 */
export async function deleteUserRows(db: D1Database, userId: string, email: string) {
  const orm = drizzle(db);
  await orm.batch([
    orm.delete(attachments).where(eq(attachments.userId, userId)),
    orm.delete(subtasks).where(eq(subtasks.userId, userId)),
    orm.delete(tasks).where(eq(tasks.userId, userId)),
    orm.delete(projects).where(eq(projects.userId, userId)),
    orm.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)),
    orm.delete(userSettings).where(eq(userSettings.userId, userId)),
    orm.delete(session).where(eq(session.userId, userId)),
    orm.delete(account).where(eq(account.userId, userId)),
    // Reset tokens point at the user id; other Better Auth tokens at the email.
    orm.delete(verification).where(or(eq(verification.value, userId), eq(verification.identifier, email))),
    orm.delete(user).where(eq(user.id, userId)),
  ]);
}
