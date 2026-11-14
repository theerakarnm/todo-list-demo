import { generateNKeysBetween } from "fractional-indexing";
import { v7 as uuidv7 } from "uuid";
import {
  type CompleteOnboardingInput,
  STARTER_PROJECT_COLORS,
  STARTER_PROJECT_NAMES,
} from "../../shared/schemas/onboarding";

// Every statement below only acts while `onboarded_at` is still empty. D1 runs a
// batch as one transaction, so a repeated or double-clicked call changes nothing.
const WHILE_NOT_ONBOARDED = "EXISTS (SELECT 1 FROM user_settings WHERE user_id = ? AND onboarded_at IS NULL)";

/** Saves onboarding steps 1 and 2 in one go and marks onboarding done. */
export async function completeOnboarding(db: D1Database, userId: string, input: CompleteOnboardingInput) {
  const now = Date.now();
  // The fixed list order, without duplicates.
  const names = STARTER_PROJECT_NAMES.filter((name) => input.starterProjects.includes(name));
  const positions = generateNKeysBetween(null, null, names.length);

  const createProjects = names.map((name, index) =>
    db
      .prepare(
        `INSERT INTO projects (id, user_id, name, color, position, created_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${WHILE_NOT_ONBOARDED}`,
      )
      .bind(uuidv7(), userId, name, STARTER_PROJECT_COLORS[name], positions[index], now, now, userId),
  );

  const saveSettings = db
    .prepare(
      `UPDATE user_settings
       SET display_name = ?, theme = ?, timezone = coalesce(?, timezone), onboarded_at = ?
       WHERE user_id = ? AND onboarded_at IS NULL`,
    )
    .bind(input.displayName, input.theme, input.timezone ?? null, now, userId);

  // Projects first: they check onboarded_at before the update fills it in.
  await db.batch([...createProjects, saveSettings]);
}
