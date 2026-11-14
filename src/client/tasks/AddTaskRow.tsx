import { type KeyboardEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS } from "../../shared/constants";
import { Icon } from "../components/Icon";

type AddTaskInputProps = {
  /** Where the task goes, e.g. "due: today" or "to: inbox". */
  hint: string;
  onAdd: (title: string) => void;
  onClose: () => void;
};

/** The open "+ Add task" row: Enter saves and stays open for the next one, Esc closes. */
export function AddTaskInput({ hint, onAdd, onClose }: AddTaskInputProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Thai input methods use Enter to finish a word; that Enter is not "save".
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") onClose();
    if (event.key === "Enter" && title.trim()) {
      onAdd(title.trim());
      setTitle("");
    }
  }

  return (
    <div className="add-task">
      <Icon name="plus" size={16} />
      <input
        // biome-ignore lint/a11y/noAutofocus: the user just asked for this field by pressing "Add task".
        autoFocus
        aria-label={t("task.addTask")}
        placeholder={t("task.addTaskPlaceholder")}
        maxLength={LIMITS.taskTitleLength}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => !title.trim() && onClose()}
      />
      <span className="mono text-[11px]">{hint}</span>
    </div>
  );
}

/** "+ Add task" at the bottom of a list; it turns into an input when pressed. */
export function AddTaskRow({ hint, onAdd }: Omit<AddTaskInputProps, "onClose">) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (open) return <AddTaskInput hint={hint} onAdd={onAdd} onClose={() => setOpen(false)} />;
  return (
    <button type="button" className="add-task" onClick={() => setOpen(true)}>
      <Icon name="plus" size={16} />
      <span>{t("task.addTask")}</span>
      <span className="mono ml-auto text-[11px]">{hint}</span>
    </button>
  );
}
