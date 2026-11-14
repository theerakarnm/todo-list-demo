import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { LIMITS, type ProjectColor } from "../../shared/constants";
import { DialogFrame } from "../components/DialogFrame";
import { useCreateProject } from "../data/project-mutations";
import { ColorPicker } from "./ColorPicker";

/** "New Project" from the sidebar: a name and one of the 5 colours, then straight to the new project. */
export function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [color, setColor] = useState<ProjectColor>("blue");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const id = createProject({ name, color });
    onClose();
    navigate(`/app/projects/${id}`);
  }

  return (
    <DialogFrame title={t("newProject.title")} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="mono muted">{t("newProject.name")}</span>
          <input
            className="field text-xl"
            required
            maxLength={LIMITS.projectNameLength}
            placeholder={t("newProject.namePlaceholder")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <ColorPicker name="new-project-color" value={color} onChange={setColor} />
        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t("newProject.cancel")}
          </button>
          <button type="submit" className="btn">
            {t("newProject.create")}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}
