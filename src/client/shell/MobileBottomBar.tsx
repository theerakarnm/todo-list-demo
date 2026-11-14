import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { Icon } from "../components/Icon";

type MobileBottomBarProps = {
  onOpenSearch: () => void;
  onOpenQuickAdd: () => void;
};

const itemClass = "bottom-bar-item";

/** Bottom bar on phones and tablets: three smart views, Search and Add. */
export function MobileBottomBar({ onOpenSearch, onOpenQuickAdd }: MobileBottomBarProps) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("bottomBar.label")}
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t-[1.5px] border-rule bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <NavLink to="/app/today" className={itemClass}>
        <Icon name="today" size={20} />
        {t("bottomBar.today")}
      </NavLink>
      <NavLink to="/app/inbox" className={itemClass}>
        <Icon name="inbox" size={20} />
        {t("bottomBar.inbox")}
      </NavLink>
      <NavLink to="/app/upcoming" className={itemClass}>
        <Icon name="upcoming" size={20} />
        {t("bottomBar.upcoming")}
      </NavLink>
      <button type="button" className={itemClass} onClick={onOpenSearch}>
        <Icon name="search" size={20} />
        {t("bottomBar.search")}
      </button>
      <button type="button" className={`${itemClass} bottom-bar-add`} onClick={onOpenQuickAdd}>
        <Icon name="plus" size={20} />
        {t("bottomBar.add")}
      </button>
    </nav>
  );
}
