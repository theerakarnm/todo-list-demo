import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { request } from "../api/request";
import { useOptimisticMutation } from "./optimistic";
import { subtasksOf } from "./selectors";
import { positionAtEnd, putRows, removeRows } from "./store-updates";
import { SYNC_QUERY_KEY } from "./sync-query";
import type { SyncStore } from "./sync-store";
import type { Subtask } from "./types";
import { uuidv7 } from "./uuidv7";

/** Adds a subtask at the end of the task's list. Subtasks are one level only: they have no children. */
export function useCreateSubtask() {
  const queryClient = useQueryClient();
  const create = useOptimisticMutation({
    request: (subtask: Subtask) =>
      request(
        api.api.subtasks[":id"].$put({
          param: { id: subtask.id },
          json: { taskId: subtask.taskId, title: subtask.title, position: subtask.position },
        }),
      ),
    apply: (store, subtask) => putRows(store, { subtasks: [subtask] }),
    confirm: (subtask) => ({ subtasks: [subtask] }),
  });

  return (taskId: string, title: string) => {
    const store = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
    create.mutate({
      id: uuidv7(),
      taskId,
      title: title.trim(),
      completedAt: null,
      position: positionAtEnd(store ? subtasksOf(store, taskId) : []),
      createdAt: Date.now(),
      updatedAt: 0,
      deletedAt: null,
    });
  };
}

type SubtaskChanges = { title?: string; completed?: boolean };

export function useUpdateSubtask() {
  const update = useOptimisticMutation({
    request: ({ id, changes }: { id: string; changes: SubtaskChanges }) =>
      request(api.api.subtasks[":id"].$patch({ param: { id }, json: changes })),
    apply: (store, { id, changes: { title, completed } }) => {
      const subtask = store.subtasks[id];
      if (!subtask) return store;
      const completedAt = completed === undefined ? subtask.completedAt : completed ? Date.now() : null;
      return putRows(store, { subtasks: [{ ...subtask, title: title ?? subtask.title, completedAt }] });
    },
    confirm: (subtask) => ({ subtasks: [subtask] }),
  });
  return (subtask: Subtask, changes: SubtaskChanges) => update.mutate({ id: subtask.id, changes });
}

export function useDeleteSubtask() {
  const remove = useOptimisticMutation({
    request: (subtask: Subtask) => request(api.api.subtasks[":id"].$delete({ param: { id: subtask.id } })),
    apply: (store, subtask) => removeRows(store, { subtasks: [subtask.id] }),
  });
  return (subtask: Subtask) => remove.mutate(subtask);
}
