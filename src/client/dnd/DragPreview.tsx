import { PROJECT_COLOR_HEX } from "../../shared/constants";
import { useSyncStore } from "../data/sync-query";
import type { DragItem } from "./plan-drop";

/** The lifted, slightly turned row under the pointer while dragging (.tr.lift in the mockups). */
export function DragPreview({ item }: { item: DragItem }) {
  const store = useSyncStore();
  if (item.type === "project") {
    const project = store?.projects[item.id];
    if (!project) return null;
    return (
      <div className="nav-item drag-lifted">
        <i className="swatch" style={{ background: PROJECT_COLOR_HEX[project.color] }} />
        <span className="min-w-0 flex-1 truncate">{project.name}</span>
      </div>
    );
  }
  const task = store?.tasks[item.id];
  if (!task) return null;
  return (
    <div className="task-row drag-lifted">
      <span className="drag-handle" aria-hidden="true">
        <span className="drag-grip" />
      </span>
      <span className="task-check">
        <span className="check-box" />
      </span>
      <span className="task-title">{task.title}</span>
    </div>
  );
}
