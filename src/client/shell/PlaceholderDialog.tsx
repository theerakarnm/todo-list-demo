import { useTranslation } from "react-i18next";
import { Dialog } from "../components/Dialog";

type PlaceholderDialogProps = {
  title: string;
  onClose: () => void;
};

/** Stand-in for Search and Quick Add until their lanes build them. */
export function PlaceholderDialog({ title, onClose }: PlaceholderDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      label={title}
      onClose={onClose}
      className="mx-auto mt-[15vh] w-[min(640px,calc(100vw-32px))] border-[1.5px] border-rule bg-bg p-0 text-fg backdrop:bg-overlay"
    >
      <div className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-2xl font-extrabold">{title}</h2>
        <p className="muted m-0">{t("pages.comingSoon")}</p>
        <form method="dialog">
          <button type="submit" className="btn btn-outline mt-2 min-h-11 px-3.5 text-sm">
            {t("dialogs.close")}
          </button>
        </form>
      </div>
    </Dialog>
  );
}
