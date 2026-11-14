import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Icon } from "../components/Icon";

type MobileTopBarProps = {
  menuOpen: boolean;
  onOpenMenu: () => void;
};

/** Top bar on phones and tablets: menu button (opens the drawer) and the wordmark. */
export function MobileTopBar({ menuOpen, onOpenMenu }: MobileTopBarProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center gap-2 border-b-[1.5px] border-rule bg-bg px-2 lg:hidden">
      <button
        type="button"
        className="icon-button"
        aria-label={t("nav.openMenu")}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        onClick={onOpenMenu}
      >
        <Icon name="menu" size={20} />
      </button>
      <Link to="/app/today" className="display text-2xl text-fg no-underline">
        {t("app.wordmark")}
      </Link>
    </header>
  );
}
