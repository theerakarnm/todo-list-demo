import { PROJECT_COLOR_HEX } from "../../shared/constants";
import { todayFor } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { TaskRow } from "../tasks/TaskRow";
import type { DragItem } from "./plan-drop";

const noop = () => {};

/** The lifted, slightly turned row under the pointer while dragging (.tr.lift in the mockups). */
export function DragPreview({ item }: { item: DragItem }) {
  const store = useSyncStore();
  if (!store) return null;

  if (item.type === "project") {
    const project = store.projects[item.id];
    if (!project) return null;
    return (
      <div className="nav-item drag-lifted">
        <i className="swatch" style={{ background: PROJECT_COLOR_HEX[project.color] }} />
        <span className="min-w-0 flex-1 truncate">{project.name}</span>
      </div>
    );
  }

  const task = store.tasks[item.id];
  if (!task) return null;
  return (
    <div className="drag-lifted" aria-hidden="true">
      <TaskRow
        task={task}
        project={task.projectId ? store.projects[task.projectId] : undefined}
        dateStyle="full"
        today={todayFor(store, Date.now())}
        onToggle={noop}
        handle={
          <span className="drag-handle">
            <span className="drag-grip" />
          </span>
        }
      />
    </div>
  );
}
