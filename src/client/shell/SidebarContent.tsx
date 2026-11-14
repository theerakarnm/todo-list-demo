import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { ProjectsNav, type SidebarProject } from "./ProjectsNav";
import { SidebarUser } from "./SidebarUser";
import { SmartViewsNav } from "./SmartViewsNav";

type SidebarContentProps = {
  collapsed?: boolean;
  onOpenSearch: () => void;
  onOpenQuickAdd: () => void;
};

// Lane 2 replaces this with the projects query.
const NO_PROJECTS: SidebarProject[] = [];

/** Everything in the sidebar column; shared by the desktop sidebar and the mobile drawer. */
export function SidebarContent({ collapsed = false, onOpenSearch, onOpenQuickAdd }: SidebarContentProps) {
  const { t } = useTranslation();

  return (
    <>
      <SidebarUser collapsed={collapsed} />
      <button
        type="button"
        className={collapsed ? "search-row justify-center px-0" : "search-row"}
        aria-keyshortcuts="Control+K Meta+K"
        title={collapsed ? t("nav.search") : undefined}
        onClick={onOpenSearch}
      >
        <Icon name="search" />
        <span className={collapsed ? "sr-only" : undefined}>{t("nav.search")}</span>
        {!collapsed && (
          <span className="kbd ml-auto" aria-hidden="true">
            {t("nav.searchShortcut")}
          </span>
        )}
      </button>
      <button
        type="button"
        className={collapsed ? "btn px-0" : "btn justify-start"}
        aria-keyshortcuts="Q"
        title={collapsed ? t("nav.addTask") : undefined}
        onClick={onOpenQuickAdd}
      >
        <Icon name="plus" size={16} />
        <span className={collapsed ? "sr-only" : undefined}>{t("nav.addTask")}</span>
        {!collapsed && (
          <span className="kbd ml-auto" aria-hidden="true">
            {t("nav.addTaskShortcut")}
          </span>
        )}
      </button>
      <SmartViewsNav collapsed={collapsed} />
      <ProjectsNav projects={NO_PROJECTS} collapsed={collapsed} />
    </>
  );
}
