import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

type DialogFrameProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** A centred modal card like the Quick Add mockup: mono title bar with a close button, then the content. */
export function DialogFrame({ title, onClose, children }: DialogFrameProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      label={title}
      onClose={onClose}
      className="mx-auto mt-[16vh] w-[min(600px,calc(100vw-32px))] border-2 border-rule bg-bg p-0 text-fg backdrop:bg-overlay"
    >
      <div className="flex items-center justify-between border-b-[1.5px] border-rule py-1.5 pr-2 pl-5">
        <h2 className="mono m-0 font-semibold">{title}</h2>
        <form method="dialog">
          <button type="submit" className="icon-button" aria-label={t("dialogs.closeLabel")}>
            <Icon name="close" />
          </button>
        </form>
      </div>
      <div className="p-5">{children}</div>
    </Dialog>
  );
}
