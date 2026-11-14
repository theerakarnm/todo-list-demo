import { useTranslation } from "react-i18next";
import { THEMES, type Theme } from "../../shared/constants";
import { useTheme } from "../theme/ThemeProvider";

/** Page colours of each preview card; System shows light and dark side by side. */
const PREVIEW_COLORS: Record<Theme, string> = {
  light: "bg-paper text-ink-black",
  dark: "bg-stock-night text-paper",
  system: "bg-[linear-gradient(90deg,var(--paper)_50%,var(--stock-night)_50%)] text-fg-muted",
};

/** Theme picker with small page previews (onboarding mockup). A pick applies at once. */
export function ThemeCards() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="m-0 mb-9 border-0 p-0">
      <legend className="mono mb-2.5 p-0">{t("onboarding.themeLegend")}</legend>
      <div className="flex flex-wrap gap-3.5">
        {THEMES.map((theme) => (
          <label key={theme} className="segment-option m-0 flex-[1_1_150px] flex-col items-stretch gap-2.5 p-3">
            <span aria-hidden="true" className={`block h-[76px] border-[1.5px] border-ink-black p-3 ${PREVIEW_COLORS[theme]}`}>
              <span className="block h-1.5 w-3/5 bg-current" />
              <span className="mt-2 block h-1.5 w-[85%] bg-current opacity-50" />
              <span className="mt-2 block h-1.5 w-2/5 bg-ink-orange" />
            </span>
            <input
              type="radio"
              name="theme"
              value={theme}
              checked={preference === theme}
              onChange={() => setPreference(theme)}
            />
            <span>{t(`theme.${theme}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
