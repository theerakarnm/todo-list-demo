import { Hono } from "hono";
import { completeOnboardingSchema } from "../../shared/schemas/onboarding";
import { completeOnboarding } from "../db/onboarding";
import { findUserSettings } from "../db/user-settings";
import { requireSession } from "../middleware/require-session";
import type { SessionEnv } from "../types";
import { validate } from "../validate";

/** Shown once after the first sign-in: display name, theme, then starter projects (or Skip). */
export const onboardingRoutes = new Hono<SessionEnv>()
  .use(requireSession)
  .post("/complete", validate("json", completeOnboardingSchema), async (c) => {
    await completeOnboarding(c.env.DB, c.var.user.id, c.req.valid("json"));
    return c.json({ settings: await findUserSettings(c.env.DB, c.var.user.id) });
  });
