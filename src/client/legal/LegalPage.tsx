import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LIMITS } from "../../shared/constants";
import { SiteFooter } from "../components/SiteFooter";
import { LandingNav } from "../landing/LandingNav";

type LegalDocument = "privacy" | "terms";

const formatMegabytes = (bytes: number) => `${bytes / 1024 / 1024} MB`;

/** Privacy Policy and Terms of Service: short Thai text in the landing page's frame. */
export function LegalPage({ document }: { document: LegalDocument }) {
  const { t } = useTranslation();
  const sections = t(`legal.${document}.sections`, {
    returnObjects: true,
    email: t("footer.contactEmail"),
    maxTasks: LIMITS.activeTasksPerUser.toLocaleString("en-US"),
    storage: formatMegabytes(LIMITS.storageBytesPerUser),
  });

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <LandingNav />
      <main className="px-[6vw] pt-16 pb-24">
        <article className="max-w-[720px]">
          <Link to="/" className="inline-flex min-h-11 items-center font-semibold">
            {t("legal.backHome")}
          </Link>
          <div className="mono muted mt-8">{t(`legal.${document}.eyebrow`)}</div>
          <h1 className="display mt-2.5 mb-0 text-[clamp(48px,6vw,84px)]">{t(`pages.${document}.title`)}</h1>
          <p className="mono muted mt-4 mb-0 text-[11px]">{t("legal.updated")}</p>
          <p className="mt-6 mb-0 border-b-2 border-rule pb-8 text-[17px] leading-[1.7]">{t(`legal.${document}.intro`)}</p>
          {sections.map((section) => (
            <section key={section.heading} className="border-b-[1.5px] border-rule py-7">
              <h2 className="mt-0 mb-3 text-2xl leading-[1.3] font-extrabold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-0 mb-2 text-base leading-[1.7] last:mb-0">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
