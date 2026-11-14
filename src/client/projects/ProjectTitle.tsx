import { type KeyboardEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS, PROJECT_COLOR_HEX } from "../../shared/constants";
import { useUpdateProject } from "../data/project-mutations";
import type { Project } from "../data/types";

/** The project's colour square and its name, renamed by clicking it and typing (Enter or leaving saves, Esc cancels). */
export function ProjectTitle({ project }: { project: Project }) {
  const { t } = useTranslation();
  const updateProject = useUpdateProject();
  const [name, setName] = useState(project.name);

  // Another device (or Undo) renamed it.
  useEffect(() => setName(project.name), [project.name]);

  function save() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== project.name) updateProject(project, { name: trimmed });
    else setName(project.name);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setName(project.name);
      // Blur after the reset has rendered, so save() sees the old name.
      const input = event.currentTarget;
      requestAnimationFrame(() => input.blur());
    }
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
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={save}
            onKeyDown={onKeyDown}
          />
        </h1>
      </div>
      <div className="mono muted mt-2 text-[11px]">{t("pages.project.renameHint")}</div>
    </div>
  );
}
