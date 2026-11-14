import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { useDismiss } from "../components/use-dismiss";
import { useUpdateProject } from "../data/project-mutations";
import type { Project } from "../data/types";
import { ColorPicker } from "./ColorPicker";

type ProjectMenuProps = {
  project: Project;
  openTaskCount: number;
  onDelete: () => void;
};

/** The "⋯" menu of the Project mockup: change colour, delete the project. */
export function ProjectMenu({ project, openTaskCount, onDelete }: ProjectMenuProps) {
  const { t } = useTranslation();
  const updateProject = useUpdateProject();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(menuRef, open, close);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="icon-button"
        aria-label={t("pages.project.menu")}
        aria-expanded={open}
        data-open={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="more" size={20} strokeWidth={3} />
      </button>
      {open && (
        <div className="project-menu">
          <div className="px-4 pt-3.5 pb-1.5">
            <ColorPicker
              name="project-color"
              value={project.color}
              onChange={(color) => updateProject(project, { color })}
            />
          </div>
          <button
            type="button"
            className="nav-item btn-danger w-full min-h-[52px] border-0 border-t-2 border-rule"
            onClick={() => {
              close();
              onDelete();
            }}
          >
            <Icon name="trash" />
            <span className="font-bold">{t("pages.project.delete", { count: openTaskCount })}</span>
          </button>
        </div>
      )}
    </div>
  );
}
