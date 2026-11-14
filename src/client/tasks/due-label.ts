import { addDays } from "../../shared/time-zone";
import type { Task } from "../data/types";

export type DueLabel = { kind: "overdue" | "date" | "time"; date?: "today" | "tomorrow" | string; time: string | null };

/**
 * What the date slot of a task row shows. Lists grouped by day (Today, Upcoming)
 * show only the time; other lists show "วันนี้", "พรุ่งนี้" or the date.
 * An overdue task always shows its date with a ▲.
 */
export function dueLabelFor(task: Task, today: string, style: "full" | "time"): DueLabel | null {
  if (!task.dueDate) return null;
  if (task.dueDate < today) return { kind: "overdue", date: task.dueDate, time: null };
  if (style === "time") return task.dueTime ? { kind: "time", time: task.dueTime } : null;
  const date = task.dueDate === today ? "today" : task.dueDate === addDays(today, 1) ? "tomorrow" : task.dueDate;
  return { kind: "date", date, time: task.dueTime };
}
