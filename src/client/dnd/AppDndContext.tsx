import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  type Over,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateProject } from "../data/project-mutations";
import { SYNC_QUERY_KEY } from "../data/sync-query";
import type { SyncStore } from "../data/sync-store";
import { useUpdateTask } from "../data/task-mutations";
import { formatLocalDate } from "../i18n/format-date";
import { dragAnnouncements } from "./announcements";
import { collisionDetection, keyboardCoordinates } from "./collision";
import { DragPreview } from "./DragPreview";
import { dragData } from "./drag-ids";
import { type DragItem, type DropPlan, type DropTarget, planDrop } from "./plan-drop";

/** Space picks up and drops (Enter would also follow a project link), Esc cancels. */
export const KEYBOARD_CODES = { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] };

/** Spoken names of the dragged row and its target, from the store. */
function useAnnouncements(store: () => SyncStore | undefined) {
  const { t } = useTranslation();
  const nameOf = (item: DragItem | DropTarget | undefined) => {
    const rows = store();
    if (!item || !rows) return "";
    if (item.type === "task") return rows.tasks[item.id]?.title ?? "";
    if (item.type === "project") return rows.projects[item.id]?.name ?? "";
    return formatLocalDate(item.id);
  };
  const targetOf = (over: Over) => {
    const target = dragData(over.data.current);
    if (target?.type === "task") return t("dnd.targetTask", { title: nameOf(target) });
    if (target?.type === "project") return t("dnd.targetProject", { name: nameOf(target) });
    return t("dnd.targetDay", { date: nameOf(target) });
  };
  return dragAnnouncements(t, (active) => nameOf(dragData(active.data.current)), targetOf);
}

/**
 * One drag-and-drop area for the page and the sidebar, so a task can be dragged
 * from a list onto a sidebar project. Every drop is one optimistic update.
 */
export function AppDndContext({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const updateProject = useUpdateProject();
  const [dragging, setDragging] = useState<DragItem | null>(null);
  const store = () => queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
  const announcements = useAnnouncements(store);
  const sensors = useSensors(
    // A few pixels of movement first, so a click on the grip is still a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates, keyboardCodes: KEYBOARD_CODES }),
  );

  function apply(plan: DropPlan) {
    if (plan.kind === "taskPosition") updateTask(plan.task, { position: plan.position });
    if (plan.kind === "taskProject") updateTask(plan.task, { projectId: plan.projectId });
    if (plan.kind === "taskDueDate") updateTask(plan.task, { dueDate: plan.dueDate });
    if (plan.kind === "projectPosition") updateProject(plan.project, { position: plan.position });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const rows = store();
    const item = dragData(active.data.current) as DragItem | undefined;
    const plan = rows && item && planDrop(rows, item, dragData(over?.data.current));
    if (plan) apply(plan);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t("dnd.instructions") },
      }}
      onDragStart={({ active }) => setDragging(dragData(active.data.current) as DragItem)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      {children}
      <DragOverlay>{dragging && <DragPreview item={dragging} />}</DragOverlay>
    </DndContext>
  );
}
