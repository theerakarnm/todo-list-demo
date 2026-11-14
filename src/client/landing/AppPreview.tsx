import { useTranslation } from "react-i18next";

const navRow = "flex min-h-[30px] items-center gap-2 px-2 text-xs font-semibold";
const projectRow = "flex min-h-7 items-center gap-2 px-2 text-xs";

/** A small picture of the Today screen, with the orange print block behind it (Landing mockup). */
export function AppPreview() {
  const { t } = useTranslation();

  return (
    <div className="relative mx-auto max-w-[660px] min-w-0 flex-[1_1_520px]">
      <div aria-hidden="true" className="halftone-dot halftone-blue absolute -top-[70px] -right-[60px] hidden size-[340px] md:block" />
      <div aria-hidden="true" className="absolute inset-[26px_-20px_-20px_26px] bg-ink-orange mix-blend-multiply dark:mix-blend-normal" />
      <div role="img" aria-label={t("landing.preview.label")} className="relative border-[1.5px] border-rule bg-bg">
        <div className="flex items-center gap-2 border-b-[1.5px] border-rule px-3.5 py-2.5">
          <i className="swatch bg-fg" />
          <i className="swatch bg-ink-blue" />
          <i className="swatch bg-ink-orange" />
          <span className="mono muted ml-2 text-[11px]">{t("landing.preview.windowTitle")}</span>
        </div>
        <div className="flex">
          <div className="hidden w-[150px] flex-none border-r-[1.5px] border-rule px-2 py-3.5 sm:block">
            <div className={navRow}>
              {t("landing.preview.inbox")} <span className="ml-auto">{t("landing.preview.inboxCount")}</span>
            </div>
            <div className={`${navRow} bg-inverse-bg text-inverse-fg`}>
              {t("landing.preview.today")} <span className="ml-auto">{t("landing.preview.todayCount")}</span>
            </div>
            <div className={navRow}>{t("landing.preview.upcoming")}</div>
            <div className={navRow}>{t("landing.preview.completed")}</div>
            <div className="mono muted mt-3 mb-1 px-2 text-[10px]">{t("landing.preview.projects")}</div>
            <div className={projectRow}>
              <i className="swatch bg-ink-blue" />
              {t("landing.preview.projectWork")}
            </div>
            <div className={projectRow}>
              <i className="swatch bg-ink-orange" />
              {t("landing.preview.projectPersonal")}
            </div>
            <div className={projectRow}>
              <i className="swatch bg-stock-violet" />
              {t("landing.preview.projectGoals")}
            </div>
          </div>
          <div className="min-w-0 flex-1 px-5 pt-[18px] pb-5">
            <div className="mono muted text-[11px]">{t("landing.preview.date")}</div>
            <div className="flex items-end justify-between">
              <div className="display mt-1.5 mb-2.5 text-[52px]">{t("landing.preview.today")}</div>
              <div className="display text-[44px] text-ink-blue dark:text-link-hover">{t("landing.preview.left")}</div>
            </div>
            <div className="border-t-2 border-rule">
              <PreviewTask title={t("landing.preview.task1")} swatch="bg-ink-blue" badge="P1" />
              <PreviewTask title={t("landing.preview.task2")} swatch="bg-ink-blue" badge="P2" />
              <PreviewTask title={t("landing.preview.task3")} swatch="bg-ink-orange" />
              <PreviewTask title={t("landing.preview.task4")} swatch="bg-ink-blue" done />
            </div>
            <div className="muted mt-3 flex min-h-10 items-center border-[1.5px] border-dashed border-rule px-3 text-[13px]">
              {t("landing.preview.addTask")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type PreviewTaskProps = { title: string; swatch: string; badge?: "P1" | "P2"; done?: boolean };

function PreviewTask({ title, swatch, badge, done = false }: PreviewTaskProps) {
  return (
    <div className="flex min-h-[46px] items-center gap-3 border-b-[1.5px] border-rule">
      <span className={`size-4 flex-none border-[1.5px] border-rule ${done ? "bg-fg" : ""}`} />
      <span className={`flex-1 text-sm font-medium ${done ? "muted line-through" : ""}`}>{title}</span>
      <i className={`swatch ${swatch}`} />
      {badge && (
        <span
          className={`mono border-[1.5px] border-rule px-1.5 py-px text-[10px] ${badge === "P1" ? "bg-ink-orange text-ink-black" : ""}`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
