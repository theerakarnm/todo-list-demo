import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { LIMITS, type Priority } from "../../shared/constants";
import { parseQuickAdd } from "../../shared/parse-quick-add";
import { todayInTimeZone } from "../../shared/time-zone";
import { DialogFrame } from "../components/DialogFrame";
import { useSyncStore } from "../data/sync-query";
import { useCreateTask } from "../data/task-mutations";
import { useNow } from "../data/use-now";
import { BROWSER_TIME_ZONE } from "../i18n/browser-time-zone";
import { QuickAddChips } from "./QuickAddChips";
import type { QuickAddDefaults } from "./quick-add-context";

/** What the user picked in a chip. It wins over the title; null on the date means "no date". */
type ChipChoices = { projectId?: string | null; dueDate?: string | null; priority?: Priority };

type QuickAddDialogProps = { defaults: QuickAddDefaults; onClose: () => void };

/** Q anywhere: type a title (Thai dates, times and p1-p4 are read from it), Enter saves. */
export function QuickAddDialog({ defaults, onClose }: QuickAddDialogProps) {
  const { t } = useTranslation();
  const store = useSyncStore();
  const now = useNow();
  const createTask = useCreateTask();
  const [text, setText] = useState("");
  const [choices, setChoices] = useState<ChipChoices>({});

  const timeZone = store?.settings.timezone ?? BROWSER_TIME_ZONE;
  const parsed = parseQuickAdd(text, now, timeZone, store?.settings.weekStart ?? "mon");
  const dueDate = choices.dueDate !== undefined ? choices.dueDate : (parsed.dueDate ?? defaults.dueDate ?? null);
  const task = {
    title: parsed.title,
    projectId: choices.projectId !== undefined ? choices.projectId : (defaults.projectId ?? null),
    dueDate,
    dueTime: dueDate ? (parsed.dueTime ?? null) : null,
    priority: choices.priority ?? parsed.priority ?? "none",
  };

  function save(event: FormEvent) {
    event.preventDefault();
    if (!task.title || !store) return;
    createTask(task);
    onClose();
  }

  return (
    <DialogFrame title={t("quickAdd.title")} onClose={onClose}>
      <form onSubmit={save}>
        <label className="mono muted mb-2 block" htmlFor="quick-add-title">
          {t("quickAdd.titleField")}
        </label>
        <input
          id="quick-add-title"
          // biome-ignore lint/a11y/noAutofocus: the user pressed Q or "Add task" to type a task.
          autoFocus
          className="field min-h-[60px] text-xl"
          placeholder={t("quickAdd.placeholder")}
          maxLength={LIMITS.taskTitleLength}
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <QuickAddChips
          today={todayInTimeZone(now, timeZone)}
          task={task}
          onChange={(choice) => setChoices((current) => ({ ...current, ...choice }))}
        />
        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t("quickAdd.cancel")}
          </button>
          <button type="submit" className="btn" disabled={!task.title}>
            {t("quickAdd.add")}
            <span className="kbd" aria-hidden="true">
              {t("quickAdd.enterKey")}
            </span>
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}
