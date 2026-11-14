import { useDraggable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { TaskRow } from "../tasks/TaskRow";
import { DragHandle } from "./DragHandle";
import { dragId } from "./drag-ids";

type TaskRowProps = ComponentProps<typeof TaskRow>;

/** A row of a manually ordered list (Inbox, a project): drag it to a new place or onto a sidebar project. */
export function SortableTaskRow(props: TaskRowProps) {
  const { t } = useTranslation();
  const item = { type: "task", id: props.task.id } as const;
  const sortable = useSortable({
    id: dragId(item),
    data: item,
    attributes: { roleDescription: t("dnd.roleDescription") },
  });

  return (
    <TaskRow
      {...props}
      rowRef={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      dragging={sortable.isDragging}
      handle={
        <DragHandle
          name={props.task.title}
          handleRef={sortable.setActivatorNodeRef}
          attributes={sortable.attributes}
          listeners={sortable.listeners}
        />
      }
    />
  );
}

/** A row of an automatically sorted list (Upcoming): it can be dragged onto another day. */
export function DraggableTaskRow(props: TaskRowProps) {
  const { t } = useTranslation();
  const item = { type: "task", id: props.task.id } as const;
  const draggable = useDraggable({
    id: dragId(item),
    data: item,
    attributes: { roleDescription: t("dnd.roleDescription") },
  });

  return (
    <TaskRow
      {...props}
      rowRef={draggable.setNodeRef}
      dragging={draggable.isDragging}
      handle={
        <DragHandle
          name={props.task.title}
          handleRef={draggable.setActivatorNodeRef}
          attributes={draggable.attributes}
          listeners={draggable.listeners}
        />
      }
    />
  );
}
