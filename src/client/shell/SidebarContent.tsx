import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { sidebarCounts, sortedProjects } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { useNow } from "../data/use-now";
import { ProjectsNav } from "./ProjectsNav";
import { SidebarUser } from "./SidebarUser";
import { SmartViewsNav } from "./SmartViewsNav";

export type ShellActions = {
  onOpenSearch: () => void;
  onOpenQuickAdd: () => void;
  onNewProject: () => void;
};

/** Everything in the sidebar column; shared by the desktop sidebar and the mobile drawer. */
export function SidebarContent({
  collapsed = false,
  onOpenSearch,
  onOpenQuickAdd,
  onNewProject,
}: ShellActions & { collapsed?: boolean }) {
  const { t } = useTranslation();
  const store = useSyncStore();
  const now = useNow();
  const counts = store ? sidebarCounts(store, now) : undefined;
  const projects = store
    ? sortedProjects(store).map((project) => ({ ...project, openTaskCount: counts?.projects[project.id] ?? 0 }))
    : [];

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
      <SmartViewsNav collapsed={collapsed} counts={counts} />
      <ProjectsNav projects={projects} collapsed={collapsed} onNewProject={onNewProject} />
    </>
  );
}
