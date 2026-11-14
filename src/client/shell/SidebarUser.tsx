import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useMe } from "../auth/use-me";
import { Icon } from "../components/Icon";

/** Avatar, name and email, plus the Settings button (top of the sidebar). */
export function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const name = me?.settings.displayName ?? "";
  // LINE-only accounts have no email to show.
  const email = me?.user.email;
  const initial = [...name][0];

  return (
    <div className={collapsed ? "flex flex-col items-center gap-2.5" : "flex items-center gap-2.5"}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="avatar" aria-hidden="true">
          {initial}
        </span>
        <span className={collapsed ? "sr-only" : "min-w-0"}>
          <span className="block truncate text-[15px] font-bold">{name}</span>
          {email && <span className="mono muted block truncate text-[11px] normal-case">{email}</span>}
        </span>
      </div>
      <Link to="/app/settings" className="icon-button" aria-label={t("nav.settings")}>
        <Icon name="settings" />
      </Link>
    </div>
  );
}
