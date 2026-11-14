import { useTranslation } from "react-i18next";
import type { Task } from "../data/types";
import { formatLoadBarDay } from "../i18n/format-date";

/** One block per task; the column has room for this many. */
const MAX_BLOCKS = 4;

/** The daily load bar on Upcoming: a column of blocks per day, a dashed block for a free day. */
export function LoadBar({ days }: { days: { date: string; tasks: Task[] }[] }) {
  const { t } = useTranslation();
  return (
    <div role="img" aria-label={t("pages.upcoming.loadLabel")} className="load-bar">
      <div className="mono muted w-[86px] flex-none text-[11px] leading-[1.4]">{t("pages.upcoming.load")}</div>
      {days.map((day) => (
        <div key={day.date} className="flex min-w-[34px] flex-1 flex-col gap-1.5">
          <div className="flex h-[52px] flex-col-reverse gap-[3px]">
            {day.tasks.length === 0 ? (
              <i className="load-block load-block-free" />
            ) : (
              day.tasks.slice(0, MAX_BLOCKS).map((task) => <i key={task.id} className="load-block" />)
            )}
          </div>
          <div className="mono text-center text-[11px]">{formatLoadBarDay(day.date)}</div>
        </div>
      ))}
    </div>
  );
}
