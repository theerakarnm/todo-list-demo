import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LineSignInButton } from "../auth/LineSignInButton";
import { AppPreview } from "./AppPreview";
import { ArrowRight } from "./ArrowRight";

export function Hero() {
  const { t } = useTranslation();
  const highlight = t("landing.hero.highlight");
  const offsetLayer = "absolute whitespace-nowrap mix-blend-multiply dark:mix-blend-screen";

  return (
    <section className="relative flex flex-wrap items-center gap-14 overflow-hidden border-b-[1.5px] border-rule px-[6vw] pt-24 pb-[104px]">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="absolute top-5 left-[2vw]">
        <circle cx="22" cy="22" r="10" />
        <path d="M22 0 V44 M0 22 H44" />
      </svg>
      <div className="min-w-0 flex-[1_1_520px]">
        <div className="mono muted">{t("landing.hero.eyebrow")}</div>
        <h1 className="mt-[22px] mb-0 text-[clamp(52px,6.2vw,92px)] leading-[1.25] font-extrabold">
          <span className="block">{t("landing.hero.line1")}</span>
          <span className="block">{t("landing.hero.line2")}</span>
          <span className="block">
            {t("landing.hero.line3")}
            <span className="relative inline-block">
              <span aria-hidden="true" className={`${offsetLayer} top-[3px] left-1 text-ink-blue`}>
                {highlight}
              </span>
              <span aria-hidden="true" className={`${offsetLayer} -top-0.5 -left-[3px] text-ink-orange`}>
                {highlight}
              </span>
              <span className="relative">{highlight}</span>
            </span>
          </span>
        </h1>
        <p className="mono mt-5 mb-0 text-[clamp(14px,1.4vw,19px)] tracking-[0.06em]">{t("landing.hero.tagline")}</p>
        <p className="mt-7 mb-0 max-w-[520px] text-[clamp(16px,1.4vw,19px)] leading-[1.7]">{t("landing.hero.body")}</p>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link to="/signup" className="btn btn-lg w-full sm:w-auto">
            {t("landing.hero.getStarted")}
            <ArrowRight />
          </Link>
          <LineSignInButton next="/app" className="btn-lg w-full sm:w-auto" />
          <a href="#features" className="inline-flex min-h-11 items-center font-semibold">
            {t("landing.hero.howItWorks")}
          </a>
        </div>
        <p className="mono muted mt-5 mb-0 text-[11px]">{t("landing.hero.signUpWith")}</p>
      </div>
      <AppPreview />
      <div aria-hidden="true" className="mono muted absolute bottom-[22px] left-[6vw] text-[11px]">
        {t("landing.hero.gripperEdge")}
      </div>
      <div aria-hidden="true" className="mono muted absolute right-[6vw] bottom-[22px] text-[11px]">
        {t("landing.hero.plates")}
      </div>
    </section>
  );
}
