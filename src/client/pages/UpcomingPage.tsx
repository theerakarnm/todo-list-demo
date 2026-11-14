import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppPage } from "../components/AppPage";
import { Icon } from "../components/Icon";
import { PageHeader } from "../components/PageHeader";
import { upcomingDays } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { useCreateTask } from "../data/task-mutations";
import type { Task } from "../data/types";
import { useNow } from "../data/use-now";
import { formatDayMonth, formatLocalDate } from "../i18n/format-date";
import { AddTaskInput } from "../tasks/AddTaskRow";
import { LoadBar } from "../tasks/LoadBar";
import { TaskList } from "../tasks/TaskList";
import { UPCOMING_RANGES, useUpcomingRange } from "./use-upcoming-range";

type Day = { date: string; tasks: Task[] };

function DaySection({ day, isTomorrow }: { day: Day; isTomorrow: boolean }) {
  const { t } = useTranslation();
  const createTask = useCreateTask();
  const [adding, setAdding] = useState(false);
  const dateLabel = formatLocalDate(day.date);

  return (
    <div>
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
            onClick={() => setAdding(true)}
          >
            <Icon name="plus" size={16} /> {t("pages.upcoming.addTask")}
          </button>
        </div>
      </div>
      {day.tasks.length > 0 ? (
        <TaskList tasks={day.tasks} dateStyle="time" />
      ) : (
        <div className="task-row min-h-12">
          <span className="mono muted pl-4">{t("pages.upcoming.free")}</span>
        </div>
      )}
      {adding && (
        <AddTaskInput
          hint={t("task.addTaskHint.date", { date: formatDayMonth(day.date) })}
          onAdd={(title) => createTask({ title, projectId: null, dueDate: day.date })}
          onClose={() => setAdding(false)}
        />
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
