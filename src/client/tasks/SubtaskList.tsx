import { type KeyboardEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS } from "../../shared/constants";
import { Icon } from "../components/Icon";
import { subtasksOf } from "../data/selectors";
import { useCreateSubtask, useDeleteSubtask, useUpdateSubtask } from "../data/subtask-mutations";
import { useSyncStore } from "../data/sync-query";
import type { Subtask } from "../data/types";

/** Enter is "done" unless a Thai input method is still composing a word. */
function isEnter(event: KeyboardEvent) {
  return event.key === "Enter" && !event.nativeEvent.isComposing;
}

function SubtaskRow({ subtask }: { subtask: Subtask }) {
  const { t } = useTranslation();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const [title, setTitle] = useState(subtask.title);
  const done = subtask.completedAt !== null;

  useEffect(() => setTitle(subtask.title), [subtask.title]);

  function saveTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== subtask.title) updateSubtask(subtask, { title: trimmed });
    else setTitle(subtask.title);
  }

  return (
    <li className="subtask-row" data-done={done}>
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
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={saveTitle}
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

/** One level of subtasks: tick, rename, delete, and add at the bottom. */
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
      <ul className="m-0 list-none border-t-[1.5px] border-rule p-0">
        {subtasks.map((subtask) => (
          <SubtaskRow key={subtask.id} subtask={subtask} />
        ))}
      </ul>
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
