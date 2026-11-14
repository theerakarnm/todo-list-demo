import { z } from "zod";
import { LIMITS, type ProjectColor, THEMES } from "../constants";
import { titleSchema } from "./fields";
import { timezoneSchema } from "./settings";

/** Onboarding step 2 offers these projects, all pre-ticked, created in this order. */
export const STARTER_PROJECT_NAMES = ["งาน", "ส่วนตัว", "เป้าหมายปีนี้"] as const;
export type StarterProjectName = (typeof STARTER_PROJECT_NAMES)[number];

export const STARTER_PROJECT_COLORS: Record<StarterProjectName, ProjectColor> = {
  งาน: "blue",
  ส่วนตัว: "orange",
  เป้าหมายปีนี้: "violet",
};

/** Body of `POST /api/onboarding/complete`. An empty `starterProjects` is the "Skip" button. */
export const completeOnboardingSchema = z.object({
  displayName: titleSchema(LIMITS.displayNameLength),
  theme: z.enum(THEMES),
  // The browser's own time zone. An unknown one is ignored, so the default stays.
  timezone: timezoneSchema.optional().catch(undefined),
  starterProjects: z.array(z.enum(STARTER_PROJECT_NAMES)).max(STARTER_PROJECT_NAMES.length),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
