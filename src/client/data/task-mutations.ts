import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Priority } from "../../shared/constants";
import { api } from "../api/client";
import { request } from "../api/request";
import { useToast } from "../toast/ToastProvider";
import { LOGBOOK_QUERY_KEY } from "./logbook-query";
import { useOptimisticMutation } from "./optimistic";
import { inboxTasks, projectTasks, subtasksOf } from "./selectors";
import { positionAtEnd, putRows, removeRows } from "./store-updates";
import { SYNC_QUERY_KEY } from "./sync-query";
import type { SyncStore } from "./sync-store";
import type { Subtask, Task } from "./types";
import { uuidv7 } from "./uuidv7";

/** Fields the user can edit on a task. Clearing the due date clears the due time too. */
export type TaskChanges = Partial<Pick<Task, "title" | "notes" | "priority" | "projectId" | "dueDate" | "dueTime">>;

function useStoreSnapshot() {
  const queryClient = useQueryClient();
  return () => queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
}

/** Where a new task goes in the manual order: the end of its project, or of the Inbox. */
function endOfList(store: SyncStore | undefined, projectId: string | null) {
  if (!store) return positionAtEnd([]);
  return positionAtEnd(projectId ? projectTasks(store, projectId) : inboxTasks(store));
}

type NewTask = { title: string; projectId: string | null; dueDate: string | null; priority?: Priority };

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

  return ({ title, projectId, dueDate, priority = "none" }: NewTask) => {
    const task: Task = {
      id: uuidv7(),
      title: title.trim(),
      notes: "",
      priority,
      projectId,
      dueDate,
      dueTime: null,
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
  };
}

export function useUpdateTask() {
  const snapshot = useStoreSnapshot();
  const update = useOptimisticMutation({
    request: ({ id, changes }: { id: string; changes: TaskChanges & { position?: string } }) =>
      request(api.api.tasks[":id"].$patch({ param: { id }, json: changes })),
    apply: (store, { id, changes }) => {
      const task = store.tasks[id];
      if (!task) return store;
      const dueTime = changes.dueDate === null ? null : (changes.dueTime ?? task.dueTime);
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

type DeletedTask = { task: Task; subtasks: Subtask[] };

/** Deletes a task (and its subtasks) and offers Undo, which restores both. */
export function useDeleteTask() {
  const snapshot = useStoreSnapshot();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const remove = useOptimisticMutation({
    request: ({ task }: DeletedTask) => request(api.api.tasks[":id"].$delete({ param: { id: task.id } })),
    apply: (store, { task, subtasks }) =>
      removeRows(store, { tasks: [task.id], subtasks: subtasks.map((subtask) => subtask.id) }),
  });
  const restore = useOptimisticMutation({
    request: ({ task }: DeletedTask) => request(api.api.tasks[":id"].restore.$post({ param: { id: task.id } })),
    apply: (store, { task, subtasks }) => putRows(store, { tasks: [task], subtasks }),
    confirm: (task) => ({ tasks: [task] }),
  });

  return (task: Task) => {
    const store = snapshot();
    const deleted = { task, subtasks: store ? subtasksOf(store, task.id) : [] };
    remove.mutate(deleted);
    showToast({ message: t("toast.deleted", { title: task.title }), onUndo: () => restore.mutate(deleted) });
  };
}

type Reschedule = { tasks: Task[]; today: string };
type RescheduleAnswer = { tasks: { id: string; dueDate: string }[] };

/** "Reschedule" on the overdue group: every overdue task moves to today, with Undo. */
export function useRescheduleOverdue() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const reschedule = useOptimisticMutation({
    request: (_: Reschedule) => request(api.api.tasks["reschedule-overdue"].$post()),
    apply: (store, { tasks, today }) => putRows(store, { tasks: tasks.map((task) => ({ ...task, dueDate: today })) }),
  });
  const undo = useOptimisticMutation({
    // The server's list is the truth: it may have moved tasks this device has not seen yet.
    request: async ({ answer }: { tasks: Task[]; answer: Promise<RescheduleAnswer> }) =>
      request(api.api.tasks["reschedule-overdue"].undo.$post({ json: { tasks: (await answer).tasks } })),
    apply: (store, { tasks }) => putRows(store, { tasks }),
  });

  return (overdue: Task[], today: string) => {
    const answer = reschedule.mutateAsync({ tasks: overdue, today });
    // A failure is already shown by the mutation's own error toast.
    answer.catch(() => {});
    showToast({
      message: t("toast.rescheduled", { count: overdue.length }),
      onUndo: () => undo.mutate({ tasks: overdue, answer }),
    });
  };
}
