import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { LIMITS } from "../../shared/constants";
import { useMe } from "../auth/use-me";
import { ArrowRight } from "../landing/ArrowRight";
import { OnboardingLayout } from "../onboarding/OnboardingLayout";
import { ThemeCards } from "../onboarding/ThemeCards";

/** Step 1: display name and theme. Nothing is saved yet; step 2 saves both steps. */
export default function OnboardingNamePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: me } = useMe();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = String(new FormData(event.currentTarget).get("displayName")).trim();
    navigate("/onboarding/2", { state: { displayName } });
  }

  return (
    <OnboardingLayout step={1} title={t("pages.onboardingName.title")} caption={t("onboarding.nameCaption")}>
      <form onSubmit={handleSubmit}>
        <div className="field mb-6">
          <label className="mono" htmlFor="display-name">
            {t("onboarding.nameLabel")}
          </label>
          <input
            id="display-name"
            name="displayName"
            className="input"
            autoComplete="nickname"
            required
            maxLength={LIMITS.displayNameLength}
            defaultValue={me?.settings.displayName}
          />
        </div>
        <ThemeCards />
        <button type="submit" className="btn btn-lg w-full">
          {t("onboarding.continue")}
          <ArrowRight />
        </button>
      </form>
    </OnboardingLayout>
  );
}
