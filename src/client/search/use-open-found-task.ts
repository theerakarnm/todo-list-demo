import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import { SYNC_QUERY_KEY } from "../data/sync-query";
import { applyRows, type SyncStore } from "../data/sync-store";
import type { Subtask, Task } from "../data/types";
import { OPENED_IN_APP } from "../tasks/use-open-task";

/**
 * Opens a task found by Search in the TaskDrawer, on top of the current page.
 * A completed task is not in the store yet, so it goes in first with its subtasks;
 * a task already there is kept, since the store's copy is the freshest.
 */
export function useOpenFoundTask() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  return (task: Task, foundSubtasks: Subtask[]) => {
    queryClient.setQueryData<SyncStore>(SYNC_QUERY_KEY, (store) => {
      if (!store || store.tasks[task.id]) return store;
      return applyRows(store, { tasks: [task], subtasks: foundSubtasks.filter((s) => s.taskId === task.id) });
    });
    const params = new URLSearchParams(location.search);
    params.set("task", task.id);
    navigate({ pathname: location.pathname, search: `?${params}` }, { state: OPENED_IN_APP });
  };
}
