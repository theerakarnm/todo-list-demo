import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Wordmark } from "./Wordmark";

const footerLink = "inline-flex min-h-11 items-center text-paper hover:text-ink-orange";

/** Footer of the public pages (Landing mockup): Privacy, Terms, contact email and copyright. */
export function SiteFooter() {
  const { t } = useTranslation();
  const contactEmail = t("footer.contactEmail");

  return (
    <footer className="border-t-[1.5px] border-rule bg-stock-night px-[6vw] pt-14 pb-10 text-paper">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <Wordmark onDark />
        <nav aria-label={t("footer.label")} className="flex flex-wrap gap-x-8 gap-y-2">
          <Link to="/privacy" className={footerLink}>
            {t("footer.privacy")}
          </Link>
          <Link to="/terms" className={footerLink}>
            {t("footer.terms")}
          </Link>
          <a href={`mailto:${contactEmail}`} className={footerLink}>
            {t("footer.contact", { email: contactEmail })}
          </a>
        </nav>
      </div>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-paper pt-[18px]">
        <span className="mono text-[11px]">{t("footer.copyright")}</span>
        <span className="flex gap-1" aria-hidden="true">
          <i className="swatch size-4 bg-ink-blue" />
          <i className="swatch size-4 bg-ink-orange" />
          <i className="swatch size-4 border border-paper bg-ink-green" />
          <i className="swatch size-4 border border-paper" />
        </span>
      </div>
    </footer>
  );
}
