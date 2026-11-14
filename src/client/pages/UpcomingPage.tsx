import { useDroppable } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { AppPage } from "../components/AppPage";
import { Icon } from "../components/Icon";
import { PageHeader } from "../components/PageHeader";
import { upcomingDays } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import type { Task } from "../data/types";
import { useNow } from "../data/use-now";
import { dragData, dragId } from "../dnd/drag-ids";
import { formatLocalDate } from "../i18n/format-date";
import { useOpenQuickAdd } from "../quick-add/quick-add-context";
import { LoadBar } from "../tasks/LoadBar";
import { TaskList } from "../tasks/TaskList";
import { UPCOMING_RANGES, useUpcomingRange } from "./use-upcoming-range";

type Day = { date: string; tasks: Task[] };

function DaySection({ day, isTomorrow }: { day: Day; isTomorrow: boolean }) {
  const { t } = useTranslation();
  const openQuickAdd = useOpenQuickAdd();
  const dateLabel = formatLocalDate(day.date);
  // The whole day is a drop target: drop a task here to give it this date.
  const target = { type: "day", id: day.date } as const;
  const { setNodeRef, isOver, active } = useDroppable({ id: dragId(target), data: target });
  const dragged = dragData(active?.data.current);
  const showDropHint = isOver && dragged?.type === "task" && !day.tasks.some((task) => task.id === dragged.id);

  return (
    <div ref={setNodeRef}>
      <div className="mt-[26px] flex flex-wrap items-center justify-between gap-3 border-t-2 border-rule pt-2.5 pb-1">
        <h2 className="m-0 text-[22px] leading-[1.4] font-extrabold">
          {isTomorrow ? (
            <>
              {t("pages.upcoming.tomorrow")}
              <span className="muted font-medium"> - {dateLabel}</span>
            </>
          ) : (
            dateLabel
          )}
        </h2>
        <div className="flex items-center gap-3.5">
          <span className="mono muted">{t("pages.upcoming.taskCount", { count: day.tasks.length })}</span>
          <button
            type="button"
            className="btn btn-outline btn-small"
            aria-label={t("pages.upcoming.addTaskLabel", { date: dateLabel })}
            onClick={() => openQuickAdd({ dueDate: day.date })}
          >
            <Icon name="plus" size={16} /> {t("pages.upcoming.addTask")}
          </button>
        </div>
      </div>
      {showDropHint && (
        <div className="drop-hint">
          <span className="mono">{t("dnd.dropToReschedule", { date: dateLabel })}</span>
        </div>
      )}
      {day.tasks.length > 0 ? (
        <TaskList tasks={day.tasks} dateStyle="time" drag="move" />
      ) : (
        !showDropHint && (
          <div className="task-row min-h-12">
            <span className="mono muted pl-4">{t("pages.upcoming.free")}</span>
          </div>
        )
      )}
    </div>
  );
}

/** Upcoming = from tomorrow, 7 / 14 / 30 days, one section per day (empty days too). */
export default function UpcomingPage() {
  const { t } = useTranslation();
  const store = useSyncStore();
  const now = useNow();
  const { range, chooseRange } = useUpcomingRange();
  const days = store ? upcomingDays(store, now, range) : [];

  return (
    <AppPage>
      <PageHeader
        eyebrow={t("pages.upcoming.eyebrow")}
        title={t("pages.upcoming.title")}
        aside={
          <fieldset className="m-0 border-0 p-0">
            <legend className="mono muted mb-2 p-0">{t("pages.upcoming.range")}</legend>
            <div className="flex">
              {UPCOMING_RANGES.map((option) => (
                <label key={option} className="segment-option">
                  <input
                    type="radio"
                    name="upcoming-range"
                    checked={range === option}
                    onChange={() => chooseRange(option)}
                  />
                  {t("pages.upcoming.rangeOption", { count: option })}
                </label>
              ))}
            </div>
          </fieldset>
        }
      />
      {store && (
        <>
          <LoadBar days={days} />
          {days.map((day, index) => (
            <DaySection key={day.date} day={day} isTomorrow={index === 0} />
          ))}
        </>
      )}
    </AppPage>
  );
}
