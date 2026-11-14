import { useSearchParams } from "react-router";
import { useSyncStore } from "../data/sync-query";

/**
 * The task open in the TaskDrawer: its id lives in the URL (?task=<id>),
 * so a task can be linked to and Back closes it.
 */
export function useOpenTask() {
  const [searchParams, setSearchParams] = useSearchParams();
  const store = useSyncStore();
  const taskId = searchParams.get("task");
  const task = taskId ? store?.tasks[taskId] : undefined;

  function close() {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("task");
        return next;
      },
      { replace: true },
    );
  }

  return { taskId, task, loaded: store !== undefined, close };
}
