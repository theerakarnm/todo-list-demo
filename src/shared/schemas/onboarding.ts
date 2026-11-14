import { z } from "zod";
import { LIMITS, type ProjectColor, THEMES } from "../constants";
import { titleSchema } from "./fields";
import { timezoneSchema } from "./settings";

/** Onboarding step 2 offers these projects, created in this order. Labels live in th.json. */
export const STARTER_PROJECT_KEYS = ["work", "personal", "yearGoals"] as const;
export type StarterProjectKey = (typeof STARTER_PROJECT_KEYS)[number];

export const STARTER_PROJECT_COLORS: Record<StarterProjectKey, ProjectColor> = {
  work: "blue",
  personal: "orange",
  yearGoals: "violet",
};

/** The client sends the translated name with each key. */
const starterProjectSchema = z.object({
  key: z.enum(STARTER_PROJECT_KEYS),
  name: titleSchema(LIMITS.projectNameLength),
});
export type StarterProject = z.infer<typeof starterProjectSchema>;

/** Body of `POST /api/onboarding/complete`. An empty `starterProjects` is the "Skip" button. */
export const completeOnboardingSchema = z.object({
  displayName: titleSchema(LIMITS.displayNameLength),
  theme: z.enum(THEMES),
  // The browser's own time zone. An unknown one is ignored, so the default stays.
  timezone: timezoneSchema.optional().catch(undefined),
  starterProjects: z.array(starterProjectSchema).max(STARTER_PROJECT_KEYS.length),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
