import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { Icon, type IconName } from "../components/Icon";

type SmartView = {
  path: string;
  icon: IconName;
  labelKey: "nav.inbox" | "nav.today" | "nav.upcoming" | "nav.completed";
  countKey?: "inbox" | "today";
};

const SMART_VIEWS: SmartView[] = [
  { path: "/app/inbox", icon: "inbox", labelKey: "nav.inbox", countKey: "inbox" },
  { path: "/app/today", icon: "today", labelKey: "nav.today", countKey: "today" },
  { path: "/app/upcoming", icon: "upcoming", labelKey: "nav.upcoming" },
  { path: "/app/logbook", icon: "completed", labelKey: "nav.completed" },
];

type SmartViewsNavProps = {
  collapsed: boolean;
  /** Active tasks in the Inbox and in Today; left out until the tasks have loaded. */
  counts?: { inbox: number; today: number };
};

export function SmartViewsNav({ collapsed, counts }: SmartViewsNavProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className={collapsed ? "sr-only" : "mono section-label"}>{t("nav.smartViews")}</div>
      <nav aria-label={t("nav.smartViews")} className="flex flex-col gap-0.5">
        {SMART_VIEWS.map(({ path, icon, labelKey, countKey }) => {
          const count = countKey ? counts?.[countKey] : undefined;
          return (
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
          );
        })}
      </nav>
    </>
  );
}
