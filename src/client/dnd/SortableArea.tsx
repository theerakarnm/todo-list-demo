import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, type SortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { KEYBOARD_CODES } from "./AppDndContext";
import { dragAnnouncements } from "./announcements";
import { planMove } from "./plan-move";

type Sortable = { id: string; position: string };

type SortableAreaProps<Row extends Sortable> = {
  rows: Row[];
  /** What a screen reader calls a row. */
  nameOf: (row: Row) => string;
  strategy: SortingStrategy;
  onMove: (row: Row, position: string) => void;
  children: ReactNode;
};

/**
 * Drag to reorder inside the TaskDrawer (subtasks, images). Its own drag area:
 * the drawer is a modal, so the page's area (and its announcements) cannot reach in;
 * these are announced inside the drawer.
 */
export function SortableArea<Row extends Sortable>({ rows, nameOf, strategy, onMove, children }: SortableAreaProps<Row>) {
  const { t } = useTranslation();
  const [announcer, setAnnouncer] = useState<HTMLElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: KEYBOARD_CODES }),
  );
  const nameOfId = (id: string | number) => {
    const row = rows.find((candidate) => candidate.id === id);
    return row ? nameOf(row) : "";
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    const move = planMove(rows, String(active.id), over ? String(over.id) : undefined);
    if (move) onMove(move.row, move.position);
  }

  return (
    <div ref={setAnnouncer}>
      {announcer && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            container: announcer,
            screenReaderInstructions: { draggable: t("dnd.instructions") },
            announcements: dragAnnouncements(
              t,
              (active) => nameOfId(active.id),
              (over) => t("dnd.targetTask", { title: nameOfId(over.id) }),
            ),
          }}
        >
          <SortableContext items={rows.map((row) => row.id)} strategy={strategy}>
            {children}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
