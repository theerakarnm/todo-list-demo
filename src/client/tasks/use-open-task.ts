import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useSyncStore } from "../data/sync-query";

/** History state of a drawer opened from a task row, so closing it can go Back instead. */
export const OPENED_IN_APP = { taskDrawer: "opened-in-app" };

/**
 * The task open in the TaskDrawer: its id lives in the URL (?task=<id>),
 * so a task can be linked to and Back closes it.
 */
export function useOpenTask() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const store = useSyncStore();
  const taskId = searchParams.get("task");
  const task = taskId ? store?.tasks[taskId] : undefined;

  function close() {
    // Opened from a list: step back, so history has no leftover drawer entry.
    if (location.state?.taskDrawer === OPENED_IN_APP.taskDrawer) {
      navigate(-1);
      return;
    }
    // Opened from a link: there is nothing to go back to in the app.
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
