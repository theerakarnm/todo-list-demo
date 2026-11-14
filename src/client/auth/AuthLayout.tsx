import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Wordmark } from "../components/Wordmark";

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** Login / Signup layout: the form column on the left, the violet plate on the right (desktop only). */
export function AuthLayout({ eyebrow, title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <div className="flex min-h-dvh flex-1 flex-col px-[5vw] pt-7 pb-12">
        <div>
          <Wordmark />
        </div>
        <main className="flex flex-1 items-center py-8">
          <div className="mx-auto w-full max-w-[420px]">
            <div className="mono muted">{eyebrow}</div>
            <h1 className="mt-3 mb-1.5 text-[clamp(36px,9vw,48px)] leading-[1.25] font-extrabold">{title}</h1>
            {subtitle && <p className="muted mt-0 mb-7 text-base">{subtitle}</p>}
            {children}
          </div>
        </main>
      </div>
      <VioletPlate />
    </div>
  );
}

/** Decoration from the Login and Signup mockups: "06 - งานวันนี้ แค่นี้พอ" on violet with a halftone dot. */
function VioletPlate() {
  const { t } = useTranslation();

  return (
    <div aria-hidden="true" className="relative hidden flex-1 overflow-hidden bg-stock-violet px-[5vw] py-10 text-paper lg:block">
      <div className="halftone-dot absolute -right-[90px] -bottom-[110px] size-[460px] opacity-40" />
      <div className="mono relative">{t("auth.panel.plate")}</div>
      <div className="display relative mt-[10vh] text-[clamp(160px,20vw,280px)] leading-[0.85]">{t("auth.panel.number")}</div>
      <div className="relative mt-4 text-[clamp(28px,3vw,44px)] leading-[1.3] font-extrabold">{t("auth.panel.headline")}</div>
      <div className="mono relative mt-2.5">{t("auth.panel.caption")}</div>
    </div>
  );
}

/** "or / หรือ" between the LINE button and the email form. */
export function OrDivider() {
  const { t } = useTranslation();

  return (
    <div className="my-[22px] flex items-center gap-3.5">
      <span className="flex-1 border-t-[1.5px] border-rule" />
      <span className="mono muted">{t("auth.or")}</span>
      <span className="flex-1 border-t-[1.5px] border-rule" />
    </div>
  );
}
