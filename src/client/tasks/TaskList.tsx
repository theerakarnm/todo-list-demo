import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo } from "react";
import { todayInTimeZone } from "../../shared/time-zone";
import { subtaskProgress, todayFor } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { useCompleteTask, useUncompleteTask } from "../data/task-mutations";
import type { Task } from "../data/types";
import { useNow } from "../data/use-now";
import { dragId } from "../dnd/drag-ids";
import { DraggableTaskRow, SortableTaskRow } from "../dnd/DraggableTaskRow";
import { TaskRow } from "./TaskRow";

type TaskListProps = {
  tasks: Task[];
  dateStyle: "full" | "time";
  /** The project page leaves out the project chip: every task is in that project. */
  showProject?: boolean;
  /** "sort" = drag to reorder (Inbox, projects); "move" = drag onto another day (Upcoming). */
  drag?: "sort" | "move";
};

const ROW_FOR = { sort: SortableTaskRow, move: DraggableTaskRow, none: TaskRow };

/** A list of task rows. Ticking completes (with Undo); unticking a completed task restores it. */
export function TaskList({ tasks, dateStyle, showProject = true, drag }: TaskListProps) {
  const store = useSyncStore();
  const now = useNow();
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();
  const progress = useMemo(() => (store ? subtaskProgress(store) : new Map()), [store]);
  if (!store) return null;

  const today = todayFor(store, now);
  const Row = ROW_FOR[drag ?? "none"];
  const rows = (
    <div>
      {tasks.map((task) => (
        <Row
          key={task.id}
          task={task}
          project={showProject && task.projectId ? store.projects[task.projectId] : undefined}
          progress={progress.get(task.id)}
          dateStyle={dateStyle}
          today={today}
          completedOn={task.completedAt ? todayInTimeZone(task.completedAt, store.settings.timezone) : undefined}
          onToggle={task.completedAt ? uncomplete : complete}
        />
      ))}
    </div>
  );
  if (drag !== "sort") return rows;
  return (
    <SortableContext
      items={tasks.map((task) => dragId({ type: "task", id: task.id }))}
      strategy={verticalListSortingStrategy}
    >
      {rows}
    </SortableContext>
  );
}
