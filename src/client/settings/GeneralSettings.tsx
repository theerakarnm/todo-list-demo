import { useTranslation } from "react-i18next";
import { START_PAGES, THEMES, WEEK_STARTS } from "../../shared/constants";
import type { UpdateSettingsInput } from "../../shared/schemas/settings";
import { errorMessage } from "../auth/error-message";
import { FormError } from "../auth/FormError";
import type { Me } from "../auth/use-me";
import { SegmentedChoice } from "./SegmentedChoice";
import { timeZoneOptions } from "./time-zones";
import { useUpdateSettings } from "./use-update-settings";

/** Settings → General: theme, start page, week start and time zone. Every change saves at once. */
export function GeneralSettings({ settings }: { settings: Me["settings"] }) {
  const { t } = useTranslation();
  const updateSettings = useUpdateSettings();
  const save = (changes: UpdateSettingsInput) => updateSettings.mutate(changes);

  return (
    <>
      {updateSettings.isError && (
        <div className="mb-6">
          <FormError>{errorMessage(updateSettings.error, t)}</FormError>
        </div>
      )}
      <SegmentedChoice
        legend={t("settingsGeneral.themeLegend")}
        name="theme"
        options={THEMES.map((theme) => ({ value: theme, label: t(`theme.${theme}`) }))}
        value={settings.theme}
        onChange={(theme) => save({ theme })}
      />
      <SegmentedChoice
        legend={t("settingsGeneral.startPageLegend")}
        name="startPage"
        options={START_PAGES.map((page) => ({ value: page, label: t(`settingsGeneral.startPage.${page}`) }))}
        value={settings.startPage}
        onChange={(startPage) => save({ startPage })}
      />
      <SegmentedChoice
        legend={t("settingsGeneral.weekStartLegend")}
        name="weekStart"
        options={WEEK_STARTS.map((day) => ({ value: day, label: t(`settingsGeneral.weekStart.${day}`) }))}
        value={settings.weekStart}
        onChange={(weekStart) => save({ weekStart })}
      />
      <div className="form-field">
        <label className="mono" htmlFor="timezone">
          {t("settingsGeneral.timezoneLabel")}
        </label>
        <select
          id="timezone"
          className="input"
          value={settings.timezone}
          onChange={(event) => save({ timezone: event.target.value })}
        >
          {timeZoneOptions(settings.timezone).map((zone) => (
            <option key={zone.value} value={zone.value}>
              {zone.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
