import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** "ทุกอย่างที่ต้องใช้": the four feature cards of the Landing mockup. */
export function Features() {
  const { t } = useTranslation();
  const bigKey = "kbd px-[18px] py-2 text-xl border-b-8";

  return (
    <section id="features" className="px-[6vw] py-24">
      <div className="mono muted">{t("landing.features.eyebrow")}</div>
      <h2 className="mt-4 mb-10 max-w-[900px] text-[clamp(34px,4.4vw,64px)] leading-[1.25] font-extrabold">
        {t("landing.features.title")}
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] border-t-2 border-l-[1.5px] border-rule">
        <FeatureCard feature="capture" art={<span className={bigKey}>{t("landing.features.capture.key")}</span>} />
        <FeatureCard
          feature="today"
          art={
            <span className="mono border-[1.5px] border-rule bg-ink-orange px-3 py-1.5 text-sm text-ink-black">
              {t("landing.features.today.badge")}
            </span>
          }
        />
        <FeatureCard feature="search" art={<span className={bigKey}>{t("landing.features.search.key")}</span>} />
        <FeatureCard feature="sync" art={<SyncPicture />} />
      </div>
    </section>
  );
}

type FeatureCardProps = { feature: "capture" | "today" | "search" | "sync"; art: ReactNode };

function FeatureCard({ feature, art }: FeatureCardProps) {
  const { t } = useTranslation();

  return (
    <article className="flex flex-col gap-3.5 border-r-[1.5px] border-b-[1.5px] border-rule px-7 pt-8 pb-10">
      <div className="display text-[96px] leading-[0.9] text-ink-blue dark:text-link-hover">
        {t(`landing.features.${feature}.number`)}
      </div>
      <div aria-hidden="true" className="flex min-h-16 items-center">
        {art}
      </div>
      <h3 className="mt-2 mb-0 text-[28px] leading-[1.3] font-extrabold">{t(`landing.features.${feature}.title`)}</h3>
      <div className="mono muted">{t(`landing.features.${feature}.caption`)}</div>
      <p className="m-0 text-base leading-[1.7]">{t(`landing.features.${feature}.body`)}</p>
    </article>
  );
}

/** A laptop and a phone joined by a dashed arrow. */
function SyncPicture() {
  return (
    <svg width="150" height="60" viewBox="0 0 150 60" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="1" y="8" width="84" height="46" />
      <path d="M1 44 H85" />
      <rect x="108" y="12" width="30" height="42" />
      <path d="M85 30 H108" strokeDasharray="4 4" />
      <path d="M104 26 L108 30 L104 34" />
    </svg>
  );
}
