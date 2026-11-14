import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { type ShellActions, SidebarContent } from "./SidebarContent";
import { useSidebarCollapsed } from "./use-sidebar-collapsed";

/** Left sidebar from the Today mockup (272px), or a 76px icon rail when collapsed. Desktop only. */
export function DesktopSidebar(actions: ShellActions) {
  const { t } = useTranslation();
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

  return (
    <aside
      aria-label={t("nav.sidebar")}
      data-collapsed={collapsed}
      className={`sticky top-0 hidden h-dvh flex-none flex-col gap-3.5 overflow-y-auto border-r-[1.5px] border-rule px-4 py-5 lg:flex ${
        collapsed ? "w-[76px]" : "w-[272px]"
      }`}
    >
      <SidebarContent collapsed={collapsed} {...actions} />
      <button
        type="button"
        className={`nav-item mt-auto text-fg-muted hover:text-fg ${collapsed ? "justify-center px-0" : ""}`}
        aria-expanded={!collapsed}
        title={collapsed ? t("nav.expand") : undefined}
        onClick={toggleCollapsed}
      >
        <Icon name={collapsed ? "expand" : "collapse"} />
        <span className={collapsed ? "sr-only" : "mono text-[11px]"}>
          {collapsed ? t("nav.expand") : t("nav.collapse")}
        </span>
      </button>
    </aside>
  );
}
