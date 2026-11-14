import { api } from "../api/client";
import { readJson } from "../api/request-error";
import type { StarterProject } from "../../shared/schemas/onboarding";
import type { Theme } from "../../shared/constants";

type CompleteOnboarding = { displayName: string; theme: Theme; starterProjects: StarterProject[] };

/** Saves both steps at once. The browser's time zone becomes the account's time zone. */
export async function completeOnboarding(input: CompleteOnboarding) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return readJson(await api.api.onboarding.complete.$post({ json: { ...input, timezone } }));
}
