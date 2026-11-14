import { useTranslation } from "react-i18next";
import { PRIORITIES, PRIORITY_BADGES } from "../../shared/constants";
import { Icon } from "../components/Icon";
import { sortedProjects } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { useUpdateTask } from "../data/task-mutations";
import type { Task } from "../data/types";

/** Priority choices from P1 (high) to P4 (none). */
const PRIORITY_CHOICES = [...PRIORITIES].reverse();

/** Project, due date, due time and priority of a task. Each change is saved right away. */
export function TaskDetails({ task }: { task: Task }) {
  const { t } = useTranslation();
  const store = useSyncStore();
  const updateTask = useUpdateTask();
  const projects = store ? sortedProjects(store) : [];

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="mono muted">{t("drawer.project")}</span>
        <span className="relative">
          <select
            className="field appearance-none pr-10"
            value={task.projectId ?? ""}
            onChange={(event) => updateTask(task, { projectId: event.target.value || null })}
          >
            <option value="">{t("drawer.inbox")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2">
            <Icon name="chevronDown" size={16} />
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <label className="mono muted" htmlFor="task-due-date">
          {t("drawer.dueDate")}
        </label>
        <div className="flex">
          <input
            id="task-due-date"
            type="date"
            className="field"
            value={task.dueDate ?? ""}
            onChange={(event) => updateTask(task, { dueDate: event.target.value || null })}
          />
          {task.dueDate && (
            <button
              type="button"
              className="icon-button h-[52px] w-[52px] border-[1.5px] border-l-0 border-fg"
              aria-label={t("drawer.clearDate")}
              onClick={() => updateTask(task, { dueDate: null })}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="mono muted">{t("drawer.dueTime")}</span>
        <input
          type="time"
          className="field disabled:opacity-50"
          // A time needs a date (the reminder is the date at that time).
          disabled={!task.dueDate}
          value={task.dueTime ?? ""}
          onChange={(event) => updateTask(task, { dueTime: event.target.value || null })}
        />
      </label>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 sm:col-span-2">
        <legend className="mono muted mb-2 p-0">{t("drawer.priority")}</legend>
        <div className="flex">
          {PRIORITY_CHOICES.map((priority) => (
            <label key={priority} className="segment-option mono">
              <input
                type="radio"
                name="task-priority"
                checked={task.priority === priority}
                onChange={() => updateTask(task, { priority })}
              />
              {PRIORITY_BADGES[priority]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
