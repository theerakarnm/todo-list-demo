import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Wordmark } from "../components/Wordmark";

export function LandingNav() {
  const { t } = useTranslation();

  return (
    <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-rule px-[6vw] py-3">
      <Wordmark />
      <nav className="flex flex-wrap items-center gap-1 sm:gap-3">
        <Link to="/login" className="inline-flex min-h-11 items-center px-2 font-semibold no-underline sm:px-3">
          {t("landing.nav.logIn")}
        </Link>
        <Link to="/signup" className="btn max-sm:min-h-11 max-sm:px-3 max-sm:text-sm">
          {t("landing.nav.getStarted")}
        </Link>
      </nav>
    </header>
  );
}
