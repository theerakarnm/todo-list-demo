import { useTranslation } from "react-i18next";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { SidebarContent } from "./SidebarContent";

type MobileDrawerProps = {
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenQuickAdd: () => void;
};

/** Slide-out drawer with the full sidebar. A modal dialog: focus stays inside, Esc and the overlay close it. */
export function MobileDrawer({ onClose, onOpenSearch, onOpenQuickAdd }: MobileDrawerProps) {
  const { t } = useTranslation();

  return (
    <Dialog label={t("nav.menu")} onClose={onClose} className="drawer">
      {/* Following any link in the drawer closes it. Links fire click for Enter too, so keyboards are covered. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: only listens for clicks bubbling up from links. */}
      <div
        className="flex min-h-full flex-col gap-3.5 px-4 pt-2 pb-5"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) onClose();
        }}
      >
        <form method="dialog" className="-mr-2 flex justify-end">
          <button type="submit" className="icon-button" aria-label={t("nav.closeMenu")}>
            <Icon name="close" />
          </button>
        </form>
        <SidebarContent onOpenSearch={onOpenSearch} onOpenQuickAdd={onOpenQuickAdd} />
      </div>
    </Dialog>
  );
}
