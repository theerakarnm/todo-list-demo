import { createContext, useContext } from "react";

/** What Quick Add starts with, from where it was opened: a project page, Today or an Upcoming day. */
export type QuickAddDefaults = { projectId?: string | null; dueDate?: string };

export const QuickAddContext = createContext<((defaults?: QuickAddDefaults) => void) | null>(null);

/** Opens the app shell's Quick Add, e.g. from "Add task" on an Upcoming day. */
export function useOpenQuickAdd() {
  const open = useContext(QuickAddContext);
  if (!open) throw new Error("useOpenQuickAdd needs the app shell's QuickAddContext");
  return open;
}
