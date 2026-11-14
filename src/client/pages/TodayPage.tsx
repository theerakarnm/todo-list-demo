import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { todayInTimeZone } from "../../shared/time-zone";
import { AppPage } from "../components/AppPage";
import { GroupHeading } from "../components/GroupHeading";
import { PageHeader } from "../components/PageHeader";
import { todayGroups } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { useCreateTask, useRescheduleOverdue } from "../data/task-mutations";
import { useNow } from "../data/use-now";
import { BROWSER_TIME_ZONE } from "../i18n/browser-time-zone";
import { formatLocalDate } from "../i18n/format-date";
import { AddTaskRow } from "../tasks/AddTaskRow";
import { AllClear } from "../tasks/AllClear";
import { TaskList } from "../tasks/TaskList";

/** Today = overdue tasks + tasks due today, both sorted automatically. */
export default function TodayPage() {
  const { t } = useTranslation();
  const store = useSyncStore();
  const now = useNow();
  const createTask = useCreateTask();
  const rescheduleOverdue = useRescheduleOverdue();
  if (!store) return <TodayHeader today={todayInTimeZone(now, BROWSER_TIME_ZONE)} />;

  const { today, overdue, dueToday } = todayGroups(store, now);
  const left = overdue.length + dueToday.length;

  return (
    <TodayHeader today={today} left={left}>
      {left === 0 && <AllClear title={t("pages.today.emptyTitle")} note={t("pages.today.emptyNote")} />}
      {overdue.length > 0 && (
        <>
          <GroupHeading label={t("pages.today.overdue", { count: overdue.length })}>
            <button
              type="button"
              className="btn btn-outline btn-small"
              aria-label={t("pages.today.rescheduleLabel")}
              onClick={() => rescheduleOverdue(overdue, today)}
            >
              {t("pages.today.reschedule")}
            </button>
          </GroupHeading>
          <TaskList tasks={overdue} dateStyle="time" />
        </>
      )}
      {left > 0 && (
        <>
          <GroupHeading label={t("pages.today.group", { count: dueToday.length })} />
          <TaskList tasks={dueToday} dateStyle="time" />
        </>
      )}
      <AddTaskRow
        hint={t("task.addTaskHint.today")}
        onAdd={(title) => createTask({ title, projectId: null, dueDate: today })}
      />
    </TodayHeader>
  );
}

/** The page frame: today's date and, once tasks are loaded, the big "NN เหลือ" counter. */
function TodayHeader({ today, left, children }: { today: string; left?: number; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <AppPage>
      <PageHeader
        eyebrow={t("pages.today.eyebrow", { date: formatLocalDate(today) })}
        title={t("pages.today.title")}
        aside={
          left !== undefined && (
            <div className="text-right" role="img" aria-label={t("pages.today.leftLabel", { count: left })}>
              <div className="display text-[72px] text-link-hover">{String(left).padStart(2, "0")}</div>
              <div className="mono muted">{t("pages.today.left")}</div>
            </div>
          )
        }
      />
      {children}
    </AppPage>
  );
}
