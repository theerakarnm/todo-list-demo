import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { PROJECT_COLOR_HEX, type ProjectColor } from "../../shared/constants";
import { Icon } from "../components/Icon";

export type SidebarProject = {
  id: string;
  name: string;
  color: ProjectColor;
  openTaskCount: number;
};

type ProjectsNavProps = {
  projects: SidebarProject[];
  collapsed: boolean;
};

export function ProjectsNav({ projects, collapsed }: ProjectsNavProps) {
  const { t } = useTranslation();
  const itemClass = collapsed ? "nav-item justify-center px-0" : "nav-item";

  return (
    <>
      <div className={collapsed ? "sr-only" : "mono section-label mt-2.5"}>{t("nav.projects")}</div>
      <nav aria-label={t("nav.projects")} className="flex flex-col gap-0.5">
        {projects.length === 0 && (
          <p className={collapsed ? "sr-only" : "muted m-0 px-3 text-[13px]"}>{t("nav.noProjects")}</p>
        )}
        {projects.map((project) => (
          <NavLink
            key={project.id}
            to={`/app/projects/${project.id}`}
            className={itemClass}
            title={collapsed ? project.name : undefined}
          >
            <i className="swatch" style={{ background: PROJECT_COLOR_HEX[project.color] }} />
            <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{project.name}</span>
            {!collapsed && <span className="mono ml-auto text-xs">{project.openTaskCount}</span>}
          </NavLink>
        ))}
        {/* Lane 2 opens the create-project form from here. */}
        <button
          type="button"
          className={`${itemClass} mt-2 border-dashed border-fg`}
          title={collapsed ? t("nav.newProject") : undefined}
        >
          <Icon name="plus" size={16} />
          <span className={collapsed ? "sr-only" : undefined}>{t("nav.newProject")}</span>
        </button>
      </nav>
    </>
  );
}
