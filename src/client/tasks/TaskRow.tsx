import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PROJECT_COLOR_HEX } from "../../shared/constants";
import { Icon } from "../components/Icon";
import type { Project, Task } from "../data/types";
import { formatDayMonth } from "../i18n/format-date";
import { type DueLabel, dueLabelFor } from "./due-label";
import { PriorityBadge } from "./PriorityBadge";

type TaskRowProps = {
  task: Task;
  /** Shown as a colour chip; left out on the project's own page. */
  project?: Project;
  progress?: { done: number; total: number };
  /** "time" in lists grouped by day (Today, Upcoming), "full" elsewhere. */
  dateStyle: "full" | "time";
  today: string;
  /** For completed tasks: the local date they were completed. */
  completedOn?: string;
  onToggle: (task: Task) => void;
};

function DueDate({ label }: { label: DueLabel }) {
  const { t } = useTranslation();
  if (label.kind === "overdue") {
    return (
      <span className="task-date task-date-overdue mono">
        {t("task.overdueDate", { date: formatDayMonth(label.date ?? "") })}
      </span>
    );
  }
  const day =
    label.date === "today" ? t("task.today") : label.date === "tomorrow" ? t("task.tomorrow") : label.date && formatDayMonth(label.date);
  return <span className="task-date mono">{[day, label.time].filter(Boolean).join(" ")}</span>;
}

/** One task in a list: checkbox, title (opens the TaskDrawer) and its details. */
export function TaskRow({ task, project, progress, dateStyle, today, completedOn, onToggle }: TaskRowProps) {
  const { t } = useTranslation();
  const done = task.completedAt !== null;
  const dueLabel = done ? null : dueLabelFor(task, today, dateStyle);

  return (
    <div className="task-row" data-done={done}>
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
      <Link className="task-title" to={{ search: `?task=${task.id}` }}>
        {task.title}
      </Link>
      <span className="task-meta">
        {progress && (
          <span className="task-progress mono" title={t("task.subtaskProgressLabel", progress)}>
            <Icon name="subtasks" size={12} />
            {t("task.subtaskProgress", progress)}
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
  );
}
