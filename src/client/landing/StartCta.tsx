import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ArrowRight } from "./ArrowRight";

/** The violet "เริ่มจดงานแรกของคุณวันนี้" band above the footer. */
export function StartCta() {
  const { t } = useTranslation();

  return (
    <section className="relative flex flex-wrap items-center justify-between gap-8 overflow-hidden bg-stock-violet px-[6vw] py-[104px] text-paper">
      <div aria-hidden="true" className="halftone-dot absolute -top-20 -right-[60px] size-[360px] bg-size-[9px_9px] opacity-35" />
      <div className="relative max-w-[760px]">
        <div className="mono">{t("landing.start.eyebrow")}</div>
        <h2 className="mt-[18px] mb-0 text-[clamp(40px,5vw,72px)] leading-[1.25] font-extrabold">{t("landing.start.title")}</h2>
        <p className="mono mt-3.5 mb-0 text-base">{t("landing.start.tagline")}</p>
      </div>
      <Link
        to="/signup"
        className="btn btn-lg relative border-paper bg-paper text-ink-black hover:border-ink-black hover:bg-ink-orange hover:text-ink-black"
      >
        {t("landing.start.getStarted")}
        <ArrowRight />
      </Link>
    </section>
  );
}
