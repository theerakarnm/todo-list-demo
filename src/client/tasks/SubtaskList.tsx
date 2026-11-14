import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS } from "../../shared/constants";
import { Icon } from "../components/Icon";
import { useDraft } from "../components/use-draft";
import { subtasksOf } from "../data/selectors";
import { useCreateSubtask, useDeleteSubtask, useUpdateSubtask } from "../data/subtask-mutations";
import { positionForMove } from "../data/positions";
import { useSyncStore } from "../data/sync-query";
import type { Subtask } from "../data/types";
import { KEYBOARD_CODES } from "../dnd/AppDndContext";
import { dragAnnouncements } from "../dnd/announcements";
import { DragHandle } from "../dnd/DragHandle";

/** Enter is "done" unless a Thai input method is still composing a word. */
function isEnter(event: KeyboardEvent) {
  return event.key === "Enter" && !event.nativeEvent.isComposing;
}

function SubtaskRow({ subtask }: { subtask: Subtask }) {
  const { t } = useTranslation();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const done = subtask.completedAt !== null;
  const sortable = useSortable({ id: subtask.id, attributes: { roleDescription: t("dnd.roleDescription") } });
  const title = useDraft(subtask.title, (text) => {
    if (!text.trim()) return false;
    updateSubtask(subtask, { title: text.trim() });
    return true;
  });

  return (
    <li
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className="subtask-row"
      data-done={done}
      data-dragging={sortable.isDragging}
    >
      <DragHandle
        name={subtask.title}
        handleRef={sortable.setActivatorNodeRef}
        attributes={sortable.attributes}
        listeners={sortable.listeners}
      />
      <button
        type="button"
        className="task-check"
        aria-label={t(done ? "drawer.uncompleteSubtask" : "drawer.completeSubtask", { title: subtask.title })}
        onClick={() => updateSubtask(subtask, { completed: !done })}
      >
        <span className="check-box" data-checked={done}>
          {done && <Icon name="check" size={14} strokeWidth={2.2} />}
        </span>
      </button>
      <input
        className="subtask-title"
        aria-label={t("drawer.subtaskTitle")}
        maxLength={LIMITS.subtaskTitleLength}
        {...title.field}
        onKeyDown={(event) => isEnter(event) && event.currentTarget.blur()}
      />
      <button
        type="button"
        className="icon-button"
        aria-label={t("drawer.deleteSubtask", { title: subtask.title })}
        onClick={() => deleteSubtask(subtask)}
      >
        <Icon name="trash" size={16} />
      </button>
    </li>
  );
}

/**
 * Drag to reorder subtasks. Its own drag area: the drawer is a modal, so the page's
 * area (and its announcements) cannot reach in; these are announced inside the drawer.
 */
function SortableSubtasks({ subtasks, children }: { subtasks: Subtask[]; children: ReactNode }) {
  const { t } = useTranslation();
  const updateSubtask = useUpdateSubtask();
  const [announcer, setAnnouncer] = useState<HTMLElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: KEYBOARD_CODES }),
  );
  const titleOf = (id: string | number) => subtasks.find((subtask) => subtask.id === id)?.title ?? "";

  function onDragEnd({ active, over }: DragEndEvent) {
    const fromIndex = subtasks.findIndex((subtask) => subtask.id === active.id);
    const toIndex = subtasks.findIndex((subtask) => subtask.id === over?.id);
    const moved = subtasks[fromIndex];
    if (!moved || toIndex < 0 || fromIndex === toIndex) return;
    updateSubtask(moved, { position: positionForMove(subtasks, fromIndex, toIndex) });
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
              (active) => titleOf(active.id),
              (over) => t("dnd.targetTask", { title: titleOf(over.id) }),
            ),
          }}
        >
          <SortableContext items={subtasks.map((subtask) => subtask.id)} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/** One level of subtasks: tick, rename, reorder, delete, and add at the bottom. */
export function SubtaskList({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const store = useSyncStore();
  const createSubtask = useCreateSubtask();
  const [newTitle, setNewTitle] = useState("");
  const subtasks = store ? subtasksOf(store, taskId) : [];
  const done = subtasks.filter((subtask) => subtask.completedAt !== null).length;

  return (
    <section className="flex flex-col">
      <h3 className="mono m-0 mb-2 font-semibold">{t("drawer.subtasks", { done, total: subtasks.length })}</h3>
      <SortableSubtasks subtasks={subtasks}>
        <ul className="m-0 list-none border-t-[1.5px] border-rule p-0">
          {subtasks.map((subtask) => (
            <SubtaskRow key={subtask.id} subtask={subtask} />
          ))}
        </ul>
      </SortableSubtasks>
      <label className="add-task mt-3">
        <Icon name="plus" size={16} />
        <span className="sr-only">{t("drawer.addSubtask")}</span>
        <input
          placeholder={t("drawer.addSubtaskPlaceholder")}
          maxLength={LIMITS.subtaskTitleLength}
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (!isEnter(event) || !newTitle.trim()) return;
            createSubtask(taskId, newTitle);
            setNewTitle("");
          }}
        />
      </label>
    </section>
  );
}
