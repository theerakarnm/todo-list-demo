import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { PROJECT_COLOR_HEX } from "../../shared/constants";
import { STARTER_PROJECT_COLORS, STARTER_PROJECT_NAMES, type StarterProjectName } from "../../shared/schemas/onboarding";
import { errorMessage } from "../auth/error-message";
import { FormError } from "../auth/FormError";
import { useMe } from "../auth/use-me";
import { completeOnboarding } from "../onboarding/complete-onboarding";
import { OnboardingLayout } from "../onboarding/OnboardingLayout";
import { useTheme } from "../theme/ThemeProvider";

/** Step 2: starter projects, all ticked. "Skip" creates none. Either way onboarding is done. */
export default function OnboardingProjectsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { preference: theme } = useTheme();
  // From step 1; after a reload the saved name is used instead.
  const displayName = (useLocation().state as { displayName?: string } | null)?.displayName ?? me?.settings.displayName ?? "";
  const [picked, setPicked] = useState<StarterProjectName[]>([...STARTER_PROJECT_NAMES]);

  const finish = useMutation({
    mutationFn: (starterProjects: StarterProjectName[]) => completeOnboarding({ displayName, theme, starterProjects }),
    // Fresh settings and projects; the route guard then moves on to the start page.
    onSuccess: () => queryClient.invalidateQueries(),
  });

  function toggle(name: StarterProjectName) {
    setPicked(picked.includes(name) ? picked.filter((item) => item !== name) : [...picked, name]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    finish.mutate(picked);
  }

  return (
    <OnboardingLayout step={2} title={t("pages.onboardingProjects.title")} caption={t("onboarding.projectsCaption")}>
      <p className="muted mt-[-16px] mb-6 text-base">{t("onboarding.projectsHint")}</p>
      <form onSubmit={handleSubmit}>
        <fieldset className="m-0 mb-9 flex flex-wrap border-0 p-0">
          <legend className="sr-only">{t("onboarding.projectsCaption")}</legend>
          {STARTER_PROJECT_NAMES.map((name) => (
            <label key={name} className="segment-option -mb-[1.5px] min-h-[52px]">
              <input type="checkbox" checked={picked.includes(name)} onChange={() => toggle(name)} />
              <i
                className="swatch border-[1.5px] border-ink-black"
                style={{ background: PROJECT_COLOR_HEX[STARTER_PROJECT_COLORS[name]] }}
              />
              <span>{name}</span>
            </label>
          ))}
        </fieldset>
        {finish.isError && <FormError>{errorMessage(finish.error, t)}</FormError>}
        <div className="mt-6 flex flex-wrap gap-3.5">
          <button type="submit" className="btn btn-lg flex-[1_1_240px]" disabled={finish.isPending}>
            {t("onboarding.createWorkspace")}
          </button>
          <button
            type="button"
            className="btn btn-lg btn-outline flex-[0_1_160px] max-sm:grow"
            disabled={finish.isPending}
            onClick={() => finish.mutate([])}
          >
            {t("onboarding.skip")}
          </button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
