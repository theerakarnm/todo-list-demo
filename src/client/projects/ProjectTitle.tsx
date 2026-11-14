import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS, PROJECT_COLOR_HEX } from "../../shared/constants";
import { useDraft } from "../components/use-draft";
import { useUpdateProject } from "../data/project-mutations";
import type { Project } from "../data/types";

/** The project's colour square and its name, renamed by clicking it and typing (Enter or leaving saves, Esc cancels). */
export function ProjectTitle({ project }: { project: Project }) {
  const { t } = useTranslation();
  const updateProject = useUpdateProject();
  const name = useDraft(project.name, (text) => {
    if (!text.trim()) return false;
    updateProject(project, { name: text.trim() });
    return true;
  });

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") name.reset();
    if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <i className="swatch h-7 w-7" aria-hidden="true" style={{ background: PROJECT_COLOR_HEX[project.color] }} />
        <h1 className="m-0 min-w-0 flex-1">
          <input
            className="project-title"
            aria-label={t("pages.project.nameLabel")}
            maxLength={LIMITS.projectNameLength}
            {...name.field}
            onKeyDown={onKeyDown}
          />
        </h1>
      </div>
      <div className="mono muted mt-2 text-[11px]">{t("pages.project.renameHint")}</div>
    </div>
  );
}
