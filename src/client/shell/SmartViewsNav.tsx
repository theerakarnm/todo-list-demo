import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { Icon, type IconName } from "../components/Icon";

type SmartView = {
  path: string;
  icon: IconName;
  labelKey: "nav.inbox" | "nav.today" | "nav.upcoming" | "nav.completed";
  count?: number;
};

// Counts are placeholders until lane 2 loads tasks.
const SMART_VIEWS: SmartView[] = [
  { path: "/app/inbox", icon: "inbox", labelKey: "nav.inbox", count: 0 },
  { path: "/app/today", icon: "today", labelKey: "nav.today", count: 0 },
  { path: "/app/upcoming", icon: "upcoming", labelKey: "nav.upcoming" },
  { path: "/app/logbook", icon: "completed", labelKey: "nav.completed" },
];

export function SmartViewsNav({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();

  return (
    <>
      <div className={collapsed ? "sr-only" : "mono section-label"}>{t("nav.smartViews")}</div>
      <nav aria-label={t("nav.smartViews")} className="flex flex-col gap-0.5">
        {SMART_VIEWS.map(({ path, icon, labelKey, count }) => (
          <NavLink
            key={path}
            to={path}
            className={collapsed ? "nav-item justify-center px-0" : "nav-item"}
            title={collapsed ? t(labelKey) : undefined}
          >
            <Icon name={icon} />
            <span className={collapsed ? "sr-only" : undefined}>{t(labelKey)}</span>
            {count !== undefined && !collapsed && <span className="mono count-badge ml-auto">{count}</span>}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
