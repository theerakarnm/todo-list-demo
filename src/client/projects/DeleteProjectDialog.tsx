import { useTranslation } from "react-i18next";
import { DialogFrame } from "../components/DialogFrame";

type DeleteProjectDialogProps = {
  name: string;
  openTaskCount: number;
  onConfirm: () => void;
  onClose: () => void;
};

/** Asks before a project and its tasks are deleted (ARCHITECTURE §15). Undo stays available after. */
export function DeleteProjectDialog({ name, openTaskCount, onConfirm, onClose }: DeleteProjectDialogProps) {
  const { t } = useTranslation();
  return (
    <DialogFrame title={t("pages.project.confirmTitle")} onClose={onClose}>
      <p className="m-0 text-base leading-[1.6]">{t("pages.project.confirmBody", { name, count: openTaskCount })}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          {t("pages.project.cancel")}
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {t("pages.project.confirmDelete")}
        </button>
      </div>
    </DialogFrame>
  );
}
