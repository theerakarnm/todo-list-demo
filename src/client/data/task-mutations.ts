import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Priority } from "../../shared/constants";
import { api } from "../api/client";
import { request } from "../api/request";
import { useToast } from "../toast/ToastProvider";
import { LOGBOOK_QUERY_KEY } from "./logbook-query";
import { useOptimisticMutation } from "./optimistic";
import { positionAtEnd } from "./positions";
import { attachmentsOfTask, inboxTasks, projectTasks, subtasksOf } from "./selectors";
import { putRows, removeRows } from "./store-updates";
import { SYNC_QUERY_KEY } from "./sync-query";
import type { SyncStore } from "./sync-store";
import type { Attachment, Subtask, Task } from "./types";
import { uuidv7 } from "./uuidv7";

/**
 * Fields the user can edit on a task (position by dragging it).
 * Clearing the due date clears the due time too.
 */
export type TaskChanges = Partial<
  Pick<Task, "title" | "notes" | "priority" | "projectId" | "dueDate" | "dueTime" | "position">
>;

function useStoreSnapshot() {
  const queryClient = useQueryClient();
  return () => queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
}

/** Where a new task goes in the manual order: the end of its project, or of the Inbox. */
function endOfList(store: SyncStore | undefined, projectId: string | null) {
  if (!store) return positionAtEnd([]);
  return positionAtEnd(projectId ? projectTasks(store, projectId) : inboxTasks(store));
}

type NewTask = {
  title: string;
  projectId: string | null;
  dueDate: string | null;
  dueTime?: string | null;
  priority?: Priority;
};

/** Adds a task at once and saves it in the background; returns the new task's id. */
export function useCreateTask() {
  const snapshot = useStoreSnapshot();
  const create = useOptimisticMutation({
    request: (task: Task) =>
      request(
        api.api.tasks[":id"].$put({
          param: { id: task.id },
          json: {
            title: task.title,
            notes: task.notes,
            priority: task.priority,
            projectId: task.projectId,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            position: task.position,
          },
        }),
      ),
    apply: (store, task) => putRows(store, { tasks: [task] }),
    confirm: (task) => ({ tasks: [task] }),
  });

  return ({ title, projectId, dueDate, dueTime = null, priority = "none" }: NewTask) => {
    const task: Task = {
      id: uuidv7(),
      title: title.trim(),
      notes: "",
      priority,
      projectId,
      dueDate,
      dueTime,
      remindAt: null,
      reminderSentAt: null,
      position: endOfList(snapshot(), projectId),
      completedAt: null,
      createdAt: Date.now(),
      // Any copy from the server is newer than this optimistic one.
      updatedAt: 0,
      deletedAt: null,
    };
    create.mutate(task);
    return task.id;
  };
}

export function useUpdateTask() {
  const snapshot = useStoreSnapshot();
  const update = useOptimisticMutation({
    request: ({ id, changes }: { id: string; changes: TaskChanges }) =>
      request(api.api.tasks[":id"].$patch({ param: { id }, json: changes })),
    apply: (store, { id, changes }) => {
      const task = store.tasks[id];
      if (!task) return store;
      const dueTime = changes.dueDate === null ? null : changes.dueTime === undefined ? task.dueTime : changes.dueTime;
      return putRows(store, { tasks: [{ ...task, ...changes, dueTime }] });
    },
    confirm: (task) => ({ tasks: [task] }),
  });

  return (task: Task, changes: TaskChanges) => {
    // Moving to another project puts the task at the end of that list (ARCHITECTURE §4).
    const moves = changes.projectId !== undefined && changes.projectId !== task.projectId;
    const position = moves ? { position: endOfList(snapshot(), changes.projectId ?? null) } : {};
    update.mutate({ id: task.id, changes: { ...changes, ...position } });
  };
}

function useSetTaskCompleted() {
  const queryClient = useQueryClient();
  return useOptimisticMutation({
    request: ({ task, completed }: { task: Task; completed: boolean }) =>
      request(api.api.tasks[":id"].$patch({ param: { id: task.id }, json: { completed } })),
    // A task un-completed from the Logbook is not in the store yet, so the Logbook's copy is used.
    apply: (store, { task, completed }) =>
      putRows(store, { tasks: [{ ...(store.tasks[task.id] ?? task), completedAt: completed ? Date.now() : null }] }),
    confirm: (task) => ({ tasks: [task] }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: LOGBOOK_QUERY_KEY }),
  });
}

/** Ticks a task done and offers Undo for 5 seconds. Undo un-completes it on the server. */
export function useCompleteTask() {
  const setCompleted = useSetTaskCompleted();
  const { showToast } = useToast();
  const { t } = useTranslation();

  return (task: Task) => {
    setCompleted.mutate({ task, completed: true });
    showToast({
      message: t("toast.completed", { title: task.title }),
      onUndo: () => setCompleted.mutate({ task, completed: false }),
    });
  };
}

/** Puts a completed task back on the lists (unticking it in the Logbook). */
export function useUncompleteTask() {
  const setCompleted = useSetTaskCompleted();
  return (task: Task) => setCompleted.mutate({ task, completed: false });
}

type DeletedTask = { task: Task; subtasks: Subtask[]; attachments: Attachment[] };

/** Deletes a task (with its subtasks and images) and offers Undo, which restores them all. */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const snapshot = useStoreSnapshot();
  const { showToast } = useToast();
  const { t } = useTranslation();
  // A deleted completed task also leaves the Logbook.
  const refreshLogbook = () => void queryClient.invalidateQueries({ queryKey: LOGBOOK_QUERY_KEY });

  const remove = useOptimisticMutation({
    request: ({ task }: DeletedTask) => request(api.api.tasks[":id"].$delete({ param: { id: task.id } })),
    apply: (store, { task, subtasks, attachments }) =>
      removeRows(store, {
        tasks: [task.id],
        subtasks: subtasks.map((subtask) => subtask.id),
        attachments: attachments.map((attachment) => attachment.id),
      }),
    onSettled: refreshLogbook,
  });
  const restore = useOptimisticMutation({
    request: ({ task }: DeletedTask) => request(api.api.tasks[":id"].restore.$post({ param: { id: task.id } })),
    apply: (store, { task, subtasks, attachments }) => putRows(store, { tasks: [task], subtasks, attachments }),
    confirm: (task) => ({ tasks: [task] }),
    onSettled: refreshLogbook,
  });

  return (task: Task) => {
    const store = snapshot();
    const deleted = {
      task,
      subtasks: store ? subtasksOf(store, task.id) : [],
      attachments: store ? attachmentsOfTask(store, task.id) : [],
    };
    remove.mutate(deleted);
    showToast({ message: t("toast.deleted", { title: task.title }), onUndo: () => restore.mutate(deleted) });
  };
}

type Reschedule = { tasks: Task[]; today: string };
type PreviousDueDates = { tasks: { id: string; dueDate: string }[] };

/** Gives each listed task in the store its listed due date, keeping everything else as it is now. */
function withDueDates(store: SyncStore, changes: { id: string; dueDate: string }[]) {
  const tasks = changes.flatMap(({ id, dueDate }) => {
    const task = store.tasks[id];
    return task ? [{ ...task, dueDate }] : [];
  });
  return putRows(store, { tasks });
}

/**
 * "Reschedule" on the overdue group: every overdue task moves to today. Undo is offered
 * once the server has answered, with its list of previous dates: it may have moved
 * tasks this device has not seen yet, and a failed reschedule has nothing to undo.
 */
export function useRescheduleOverdue() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const undo = useOptimisticMutation({
    request: (previous: PreviousDueDates) => request(api.api.tasks["reschedule-overdue"].undo.$post({ json: previous })),
    apply: (store, previous) => withDueDates(store, previous.tasks),
  });
  const reschedule = useOptimisticMutation({
    request: (_: Reschedule) => request(api.api.tasks["reschedule-overdue"].$post()),
    apply: (store, { tasks, today }) => withDueDates(store, tasks.map(({ id }) => ({ id, dueDate: today }))),
    onSuccess: (previous) =>
      showToast({
        message: t("toast.rescheduled", { count: previous.tasks.length }),
        onUndo: () => undo.mutate({ tasks: previous.tasks }),
      }),
  });

  return (overdue: Task[], today: string) => reschedule.mutate({ tasks: overdue, today });
}
