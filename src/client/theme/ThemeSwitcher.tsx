import { useTranslation } from "react-i18next";
import { THEMES } from "../../shared/constants";
import { useTheme } from "./ThemeProvider";

/** Light / Dark / System segmented choice from the Settings mockup (General tab). */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="m-0 mb-7 flex flex-col gap-2 border-0 p-0">
      <legend className="mono mb-2.5 p-0">{t("theme.legend")}</legend>
      <div className="flex flex-wrap">
        {THEMES.map((theme) => (
          <label key={theme} className="segment-option">
            <input
              type="radio"
              name="theme"
              value={theme}
              checked={preference === theme}
              onChange={() => setPreference(theme)}
            />
            {t(`theme.${theme}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
