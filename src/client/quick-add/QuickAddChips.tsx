import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PRIORITIES, PRIORITY_BADGES, PROJECT_COLOR_HEX, type Priority } from "../../shared/constants";
import { addDays } from "../../shared/time-zone";
import { Icon } from "../components/Icon";
import { sortedProjects } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { formatLocalDate } from "../i18n/format-date";

type QuickAddTask = { projectId: string | null; dueDate: string | null; dueTime: string | null; priority: Priority };
type ChipChange = Partial<{ projectId: string | null; dueDate: string | null; priority: Priority }>;

/** Priority choices from P1 (high) to P4 (none). */
const PRIORITY_CHOICES = [...PRIORITIES].reverse();

/**
 * A chip button from the Quick Add mockup with a native control laid over it:
 * the chip shows the choice, the browser's own picker changes it.
 */
function Chip({ children, control }: { children: ReactNode; control: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control comes in through the `control` prop.
    <label className="btn btn-outline btn-small quick-chip">
      {children}
      <Icon name="chevronDown" size={14} />
      {control}
    </label>
  );
}

type QuickAddChipsProps = { today: string; task: QuickAddTask; onChange: (change: ChipChange) => void };

/** Project, date and priority of the new task: what was read from the title, and changeable. */
export function QuickAddChips({ today, task, onChange }: QuickAddChipsProps) {
  const { t } = useTranslation();
  const store = useSyncStore();
  const projects = store ? sortedProjects(store) : [];
  const project = task.projectId ? store?.projects[task.projectId] : undefined;

  const day =
    task.dueDate === today
      ? t("task.today")
      : task.dueDate === addDays(today, 1)
        ? t("task.tomorrow")
        : task.dueDate && formatLocalDate(task.dueDate);
  const dateLabel = day ? [day, task.dueTime].filter(Boolean).join(" ") : t("quickAdd.noDate");

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Chip
        control={
          <select
            className="quick-chip-control"
            aria-label={t("quickAdd.chooseProject")}
            value={task.projectId ?? ""}
            onChange={(event) => onChange({ projectId: event.target.value || null })}
          >
            <option value="">{t("nav.inbox")}</option>
            {projects.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        }
      >
        <i className="swatch" style={{ background: project ? PROJECT_COLOR_HEX[project.color] : "currentColor" }} />
        {project?.name ?? t("nav.inbox")}
      </Chip>

      <span className="flex">
        <Chip
          control={
            <input
              type="date"
              className="quick-chip-control"
              aria-label={t("quickAdd.chooseDate")}
              value={task.dueDate ?? ""}
              // The chip is the button; the browser's calendar opens on click.
              onClick={(event) => event.currentTarget.showPicker?.()}
              onChange={(event) => onChange({ dueDate: event.target.value || null })}
            />
          }
        >
          <Icon name="today" size={16} />
          {dateLabel}
        </Chip>
        {task.dueDate && (
          <button
            type="button"
            className="btn btn-outline btn-small -ml-[1.5px] px-2.5"
            aria-label={t("quickAdd.clearDate")}
            onClick={() => onChange({ dueDate: null })}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </span>

      <Chip
        control={
          <select
            className="quick-chip-control"
            aria-label={t("quickAdd.choosePriority")}
            value={task.priority}
            onChange={(event) => onChange({ priority: event.target.value as Priority })}
          >
            {PRIORITY_CHOICES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`priorities.${priority}`)}
              </option>
            ))}
          </select>
        }
      >
        <Icon name="flag" size={14} />
        {PRIORITY_BADGES[task.priority]}
      </Chip>
    </div>
  );
}
