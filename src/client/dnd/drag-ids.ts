import type { DragItem, DropTarget } from "./plan-drop";

// dnd-kit needs one id per draggable or drop target across the whole page;
// the prefix keeps a task, a project and a day apart. The row id travels in `data`.

export function dragId({ type, id }: DragItem | DropTarget) {
  return `${type}:${id}`;
}

/** The `data` of a dnd-kit item or target, as the drag/drop types. */
export function dragData(data: Record<string, unknown> | undefined) {
  return data as DragItem | DropTarget | undefined;
}
