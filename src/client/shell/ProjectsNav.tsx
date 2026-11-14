import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { PROJECT_COLOR_HEX, type ProjectColor } from "../../shared/constants";
import { Icon } from "../components/Icon";
import { dragData, dragId } from "../dnd/drag-ids";

export type SidebarProject = {
  id: string;
  name: string;
  color: ProjectColor;
  openTaskCount: number;
};

type ProjectsNavProps = {
  projects: SidebarProject[];
  collapsed: boolean;
  dragAndDrop?: boolean;
  onNewProject: () => void;
};

type ProjectLinkProps = { project: SidebarProject; collapsed: boolean };

function ProjectLink({ project, collapsed }: ProjectLinkProps) {
  return (
    <NavLink
      to={`/app/projects/${project.id}`}
      className={collapsed ? "nav-item justify-center px-0" : "nav-item"}
      title={collapsed ? project.name : undefined}
    >
      <ProjectLabel project={project} collapsed={collapsed} />
    </NavLink>
  );
}

function ProjectLabel({ project, collapsed }: ProjectLinkProps) {
  return (
    <>
      <i className="swatch" style={{ background: PROJECT_COLOR_HEX[project.color] }} />
      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{project.name}</span>
      {!collapsed && <span className="mono ml-auto text-xs">{project.openTaskCount}</span>}
    </>
  );
}

/**
 * A project in the desktop sidebar: drag it to reorder the projects,
 * or drop a task on it to move the task into the project.
 */
function SortableProjectLink({ project, collapsed }: ProjectLinkProps) {
  const { t } = useTranslation();
  const item = { type: "project", id: project.id } as const;
  const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver, active } = useSortable({
    id: dragId(item),
    data: item,
    attributes: { roleDescription: t("dnd.roleDescription") },
  });
  const taskOver = isOver && dragData(active?.data.current)?.type === "task";

  return (
    <NavLink
      ref={setNodeRef}
      to={`/app/projects/${project.id}`}
      className={collapsed ? "nav-item justify-center px-0" : "nav-item"}
      title={collapsed ? project.name : undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-dragging={isDragging}
      data-drop-target={taskOver}
      // A link is natively draggable by the browser; dnd-kit does the dragging here.
      draggable={false}
      // Only the description: the link keeps its own role and focus.
      aria-roledescription={attributes["aria-roledescription"]}
      aria-describedby={attributes["aria-describedby"]}
      {...listeners}
    >
      <ProjectLabel project={project} collapsed={collapsed} />
    </NavLink>
  );
}

export function ProjectsNav({ projects, collapsed, dragAndDrop = false, onNewProject }: ProjectsNavProps) {
  const { t } = useTranslation();
  const itemClass = collapsed ? "nav-item justify-center px-0" : "nav-item";
  const Link = dragAndDrop ? SortableProjectLink : ProjectLink;
  const links = projects.map((project) => <Link key={project.id} project={project} collapsed={collapsed} />);

  return (
    <>
      <div className={collapsed ? "sr-only" : "mono section-label mt-2.5"}>{t("nav.projects")}</div>
      <nav aria-label={t("nav.projects")} className="flex flex-col gap-0.5">
        {projects.length === 0 && (
          <p className={collapsed ? "sr-only" : "muted m-0 px-3 text-[13px]"}>{t("nav.noProjects")}</p>
        )}
        {dragAndDrop ? (
          <SortableContext
            items={projects.map((project) => dragId({ type: "project", id: project.id }))}
            strategy={verticalListSortingStrategy}
          >
            {links}
          </SortableContext>
        ) : (
          links
        )}
        <button
          type="button"
          className={`${itemClass} mt-2 border-dashed border-fg`}
          title={collapsed ? t("nav.newProject") : undefined}
          onClick={onNewProject}
        >
          <Icon name="plus" size={16} />
          <span className={collapsed ? "sr-only" : undefined}>{t("nav.newProject")}</span>
        </button>
      </nav>
    </>
  );
}
