import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { NewProjectDialog } from "../projects/NewProjectDialog";
import { TaskDrawer } from "../tasks/TaskDrawer";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomBar } from "./MobileBottomBar";
import { MobileDrawer } from "./MobileDrawer";
import { MobileTopBar } from "./MobileTopBar";
import { PlaceholderDialog } from "./PlaceholderDialog";
import { useShortcut } from "./use-shortcut";

type OpenDialog = "drawer" | "search" | "quickAdd" | "newProject" | null;

/**
 * Layout of every signed-in screen.
 * Desktop (lg and up): sidebar + page. Smaller: top bar, page, bottom bar and a drawer.
 */
export default function AppShell() {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  const openDrawer = useCallback(() => setOpenDialog("drawer"), []);
  const openSearch = useCallback(() => setOpenDialog("search"), []);
  const openQuickAdd = useCallback(() => setOpenDialog("quickAdd"), []);
  const openNewProject = useCallback(() => setOpenDialog("newProject"), []);
  const closeDialog = useCallback(() => setOpenDialog(null), []);

  useShortcut({ code: "KeyK", withModifier: true }, openSearch);
  useShortcut({ code: "KeyQ" }, openQuickAdd);
  const actions = { onOpenSearch: openSearch, onOpenQuickAdd: openQuickAdd, onNewProject: openNewProject };

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <DesktopSidebar {...actions} />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0">
        <MobileTopBar menuOpen={openDialog === "drawer"} onOpenMenu={openDrawer} />
        <Outlet />
      </div>
      <MobileBottomBar onOpenSearch={openSearch} onOpenQuickAdd={openQuickAdd} />

      {openDialog === "drawer" && (
        <MobileDrawer onClose={closeDialog} {...actions} />
      )}
      {openDialog === "search" && <PlaceholderDialog title={t("nav.search")} onClose={closeDialog} />}
      {openDialog === "quickAdd" && <PlaceholderDialog title={t("nav.addTask")} onClose={closeDialog} />}
      {openDialog === "newProject" && <NewProjectDialog onClose={closeDialog} />}
      <TaskDrawer />
    </div>
  );
}
