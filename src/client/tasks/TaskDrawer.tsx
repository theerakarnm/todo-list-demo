import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS } from "../../shared/constants";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { useDraft } from "../components/use-draft";
import { useCompleteTask, useDeleteTask, useUncompleteTask, useUpdateTask } from "../data/task-mutations";
import type { Task } from "../data/types";
import { useUploadImages } from "../data/attachment-mutations";
import { ImageGallery } from "../images/ImageGallery";
import { useFileDrop } from "../images/use-file-drop";
import { SubtaskList } from "./SubtaskList";
import { TaskDetails } from "./TaskDetails";
import { useOpenTask } from "./use-open-task";

type TaskEditorProps = { task: Task; onDeleted: () => void; dropping: boolean };

function TaskEditor({ task, onDeleted, dropping }: TaskEditorProps) {
  const { t } = useTranslation();
  const updateTask = useUpdateTask();
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();
  const deleteTask = useDeleteTask();
  const done = task.completedAt !== null;

  const title = useDraft(task.title, (text) => {
    if (!text.trim()) return false;
    updateTask(task, { title: text.trim() });
    return true;
  });
  const notes = useDraft(task.notes, (text) => {
    updateTask(task, { notes: text });
    return true;
  });

  function onTitleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter saves the title; it is one line, so a new line is never wanted.
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.blur();
  }

  return (
    <div className="flex flex-col gap-7 p-5">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="task-check -ml-3"
          aria-label={t(done ? "task.uncomplete" : "task.complete", { title: task.title })}
          onClick={() => (done ? uncomplete(task) : complete(task))}
        >
          <span className="check-box" data-checked={done}>
            {done && <Icon name="check" size={14} strokeWidth={2.2} />}
          </span>
        </button>
        <textarea
          className="drawer-title"
          aria-label={t("drawer.title")}
          rows={1}
          maxLength={LIMITS.taskTitleLength}
          onKeyDown={onTitleKeyDown}
          {...title.field}
        />
      </div>

      <label className="flex flex-col gap-2">
        <span className="mono muted">{t("drawer.notes")}</span>
        <textarea
          className="field min-h-28 py-3 leading-[1.6]"
          placeholder={t("drawer.notesPlaceholder")}
          maxLength={LIMITS.taskNotesLength}
          {...notes.field}
        />
      </label>

      <ImageGallery taskId={task.id} dropping={dropping} />

      <TaskDetails task={task} />
      <SubtaskList taskId={task.id} />

      <button
        type="button"
        className="btn btn-outline self-start"
        onClick={() => {
          deleteTask(task);
          onDeleted();
        }}
      >
        <Icon name="trash" size={16} />
        {t("drawer.delete")}
      </button>
    </div>
  );
}

/**
 * Task details, opened by clicking a task (?task=<id> in the URL).
 * A side panel on the right on desktop, a full-screen sheet on mobile.
 */
export function TaskDrawer() {
  const { t } = useTranslation();
  const { taskId, task, loaded, close } = useOpenTask();
  const uploadImages = useUploadImages();
  // Images can be dropped or pasted anywhere in the drawer.
  const fileDrop = useFileDrop((files) => task && uploadImages(task.id, files));
  if (!taskId) return null;

  return (
    <Dialog
      label={t("drawer.label")}
      onClose={close}
      className="task-drawer"
      data-dropping={fileDrop.dropping}
      {...fileDrop.handlers}
    >
      <div className="sticky top-0 z-[1] flex items-center justify-between border-b-[1.5px] border-rule bg-bg py-1.5 pr-2 pl-5">
        <h2 className="mono m-0 font-semibold">{t("drawer.heading")}</h2>
        <form method="dialog">
          <button type="submit" className="icon-button" aria-label={t("drawer.close")}>
            <Icon name="close" />
          </button>
        </form>
      </div>
      {task && <TaskEditor key={task.id} task={task} onDeleted={close} dropping={fileDrop.dropping} />}
      {!task && loaded && <p className="muted p-5">{t("drawer.notFound")}</p>}
    </Dialog>
  );
}
