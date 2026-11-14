import type { QuickAddDefaults } from "./quick-add-context";

/** Quick Add from Q or the Add button starts in the page's project, or on today's date on Today. */
export function pageDefaults(pathname: string, today: string | undefined): QuickAddDefaults {
  const project = pathname.match(/^\/app\/projects\/([^/]+)/);
  if (project) return { projectId: project[1] };
  if (pathname === "/app/today" && today) return { dueDate: today };
  return {};
}
