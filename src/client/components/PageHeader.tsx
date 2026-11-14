import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Right side of the header, e.g. the "06 left" counter on Today. */
  aside?: ReactNode;
};

/** The header of every signed-in page, as in the Today and Settings mockups. */
export function PageHeader({ eyebrow, title, subtitle, aside }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-rule pb-[22px]">
      <div>
        <div className="mono muted">{eyebrow}</div>
        <h1 className="display mt-2.5 mb-0 text-[clamp(48px,6vw,84px)]">{title}</h1>
        {subtitle && <p className="muted mt-4 mb-0 text-[15px]">{subtitle}</p>}
      </div>
      {aside}
    </header>
  );
}
