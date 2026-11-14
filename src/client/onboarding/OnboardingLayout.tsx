import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Wordmark } from "../components/Wordmark";

type OnboardingLayoutProps = {
  step: 1 | 2;
  title: string;
  caption: string;
  children: ReactNode;
};

/** Frame of both onboarding steps: header, two-part progress bar, step label and title. */
export function OnboardingLayout({ step, title, caption, children }: OnboardingLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg text-fg">
      <div aria-hidden="true" className="halftone-dot halftone-blue absolute -right-[120px] -bottom-[140px] hidden size-[420px] opacity-50 md:block" />
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="absolute bottom-6 left-[3vw]">
        <circle cx="22" cy="22" r="10" />
        <path d="M22 0 V44 M0 22 H44" />
      </svg>
      <header className="relative flex items-center justify-between border-b-[1.5px] border-rule px-[5vw] py-5">
        <Wordmark />
        <span className="mono muted">{t("onboarding.setupTime")}</span>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-[560px]">
          <div className="mb-3.5 flex gap-2" role="img" aria-label={`${t("onboarding.progress")} ${t(`onboarding.step${step}`)}`}>
            <span className="h-1.5 flex-1 border-[1.5px] border-rule bg-fg" />
            <span className={`h-1.5 flex-1 border-[1.5px] border-rule ${step === 2 ? "bg-fg" : ""}`} />
          </div>
          <div className="mono muted mb-7">{t(`onboarding.step${step}`)}</div>
          <h1 className="mt-0 mb-1.5 text-[clamp(34px,8vw,44px)] leading-[1.3] font-extrabold">{title}</h1>
          <div className="mono muted mb-7">{caption}</div>
          {children}
        </div>
      </main>
    </div>
  );
}
