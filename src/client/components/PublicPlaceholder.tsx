import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Wordmark } from "./Wordmark";

type PublicPlaceholderProps = {
  title: string;
  /** Line under the title; defaults to "this page is being built". */
  description?: string;
  children?: ReactNode;
};

/** Stand-in for public screens (landing, auth, onboarding, legal) until their lanes build them. */
export function PublicPlaceholder({ title, description, children }: PublicPlaceholderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-[5vw] pt-7 pb-12 text-fg">
      <div>
        <Wordmark />
      </div>
      <main className="flex flex-1 items-center py-8">
        <div className="mx-auto w-full max-w-[420px]">
          <h1 className="mt-3 mb-1.5 text-5xl leading-[1.25] font-extrabold">{title}</h1>
          <p className="muted m-0 text-base">{description ?? t("pages.comingSoon")}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
