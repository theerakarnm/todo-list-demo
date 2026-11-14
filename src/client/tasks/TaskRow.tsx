import type { CSSProperties, ReactNode, Ref } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { PROJECT_COLOR_HEX } from "../../shared/constants";
import { Icon } from "../components/Icon";
import type { Project, Task } from "../data/types";
import { formatDayMonth } from "../i18n/format-date";
import { type DueLabel, dueLabelFor } from "./due-label";
import { OPENED_IN_APP } from "./use-open-task";
import { PriorityBadge } from "./PriorityBadge";

type TaskRowProps = {
  task: Task;
  /** Shown as a colour chip; left out on the project's own page. */
  project?: Project;
  progress?: { done: number; total: number };
  /** How many images the task has; left out when none. */
  imageCount?: number;
  /** "time" in lists grouped by day (Today, Upcoming), "full" elsewhere. */
  dateStyle: "full" | "time";
  today: string;
  /** For completed tasks: the local date they were completed. */
  completedOn?: string;
  onToggle: (task: Task) => void;
  /** Drag and drop: the grip before the checkbox, and the row's place while it moves. */
  handle?: ReactNode;
  rowRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
  dragging?: boolean;
};

function DueDate({ label }: { label: DueLabel }) {
  const { t } = useTranslation();
  const dayName = (date?: string) => (date === "today" || date === "tomorrow" ? t(`task.${date}`) : undefined);
  if (label.kind === "overdue") {
    return (
      <span className="task-date task-date-overdue mono">
        {t("task.overdueDate", { date: formatDayMonth(label.date ?? "") })}
      </span>
    );
  }
  const day = dayName(label.date) ?? (label.date && formatDayMonth(label.date));
  return <span className="task-date mono">{[day, label.time].filter(Boolean).join(" ")}</span>;
}

/** One task in a list: checkbox, title (opens the TaskDrawer) and its details. */
export function TaskRow({
  task,
  project,
  progress,
  imageCount,
  dateStyle,
  today,
  completedOn,
  onToggle,
  handle,
  rowRef,
  style,
  dragging,
}: TaskRowProps) {
  const { t } = useTranslation();
  const done = task.completedAt !== null;
  const dueLabel = done ? null : dueLabelFor(task, today, dateStyle);
  // Opening the drawer keeps the page's own query, e.g. the Completed page's ?project=.
  const [searchParams] = useSearchParams();
  const drawerParams = new URLSearchParams(searchParams);
  drawerParams.set("task", task.id);

  return (
    <div ref={rowRef} style={style} className="task-row" data-done={done} data-dragging={dragging}>
      {handle}
      <button
        type="button"
        className="task-check"
        aria-label={t(done ? "task.uncomplete" : "task.complete", { title: task.title })}
        onClick={() => onToggle(task)}
      >
        <span className="check-box" data-checked={done}>
          {done && <Icon name="check" size={14} strokeWidth={2.2} />}
        </span>
      </button>
      <div className="task-body">
        <Link className="task-title" to={{ search: `?${drawerParams}` }} state={OPENED_IN_APP}>
          {task.title}
        </Link>
        <span className="task-meta">
          {progress && (
            <span className="task-progress mono" title={t("task.subtaskProgressLabel", progress)}>
              <Icon name="subtasks" size={12} />
              {t("task.subtaskProgress", progress)}
            </span>
          )}
          {imageCount !== undefined && imageCount > 0 && (
            <span className="task-progress mono">
              <span aria-hidden="true">{t("task.imageCount", { count: imageCount })}</span>
              <span className="sr-only">{t("task.imageCountLabel", { count: imageCount })}</span>
            </span>
          )}
          {project && (
            <span className="task-project">
              <i className="swatch" style={{ background: PROJECT_COLOR_HEX[project.color] }} />
              {project.name}
            </span>
          )}
          {completedOn && <span className="task-date mono">{formatDayMonth(completedOn)}</span>}
          {dueLabel && <DueDate label={dueLabel} />}
          {!done && <PriorityBadge priority={task.priority} />}
        </span>
      </div>
    </div>
  );
}
