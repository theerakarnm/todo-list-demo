import type { KeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

const TABS = ["account", "general"] as const;
type Tab = (typeof TABS)[number];

/**
 * Account / General tabs from the Settings mockup. The open tab is in the
 * address (?tab=general), so a reload or a link keeps it.
 */
export function SettingsTabs({ panels }: { panels: Record<Tab, ReactNode> }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const current: Tab = searchParams.get("tab") === "general" ? "general" : "account";

  function select(tab: Tab) {
    setSearchParams(tab === "account" ? {} : { tab }, { replace: true });
    document.getElementById(`settings-tab-${tab}`)?.focus();
  }

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const step = event.key === "ArrowRight" ? 1 : -1;
    select(TABS[(TABS.indexOf(current) + step + TABS.length) % TABS.length] ?? "account");
  }

  return (
    <>
      <div
        role="tablist"
        aria-label={t("settingsTabs.label")}
        className="mt-[26px] flex flex-wrap border-b-2 border-rule pl-[1.5px]"
        onKeyDown={handleKeyDown}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            id={`settings-tab-${tab}`}
            type="button"
            role="tab"
            className="settings-tab"
            aria-selected={tab === current}
            aria-controls={`settings-panel-${tab}`}
            tabIndex={tab === current ? 0 : -1}
            onClick={() => select(tab)}
          >
            {t(`settingsTabs.${tab}`)}
          </button>
        ))}
      </div>
      <div
        id={`settings-panel-${current}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${current}`}
        className="max-w-[640px] pt-8"
      >
        {panels[current]}
      </div>
    </>
  );
}
