import { useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { todayFor } from "../data/selectors";
import { useSyncPolling, useSyncStore } from "../data/sync-query";
import { AppDndContext } from "../dnd/AppDndContext";
import { NewProjectDialog } from "../projects/NewProjectDialog";
import { QuickAddDialog } from "../quick-add/QuickAddDialog";
import { pageDefaults } from "../quick-add/page-defaults";
import { QuickAddContext, type QuickAddDefaults } from "../quick-add/quick-add-context";
import { SearchDialog } from "../search/SearchDialog";
import { TaskDrawer } from "../tasks/TaskDrawer";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomBar } from "./MobileBottomBar";
import { MobileDrawer } from "./MobileDrawer";
import { MobileTopBar } from "./MobileTopBar";
import { useShortcut } from "./use-shortcut";

type OpenDialog = "drawer" | "search" | "quickAdd" | "newProject" | null;

/**
 * Layout of every signed-in screen.
 * Desktop (lg and up): sidebar + page. Smaller: top bar, page, bottom bar and a drawer.
 */
export default function AppShell() {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [quickAddDefaults, setQuickAddDefaults] = useState<QuickAddDefaults>({});
  const { pathname } = useLocation();
  const store = useSyncStore();
  const today = store ? todayFor(store, Date.now()) : undefined;

  const openDrawer = useCallback(() => setOpenDialog("drawer"), []);
  const openSearch = useCallback(() => setOpenDialog("search"), []);
  const openQuickAddWith = useCallback((defaults: QuickAddDefaults = {}) => {
    setQuickAddDefaults(defaults);
    setOpenDialog("quickAdd");
  }, []);
  const openQuickAdd = useCallback(
    () => openQuickAddWith(pageDefaults(pathname, today)),
    [openQuickAddWith, pathname, today],
  );
  const openNewProject = useCallback(() => setOpenDialog("newProject"), []);
  const closeDialog = useCallback(() => setOpenDialog(null), []);

  useShortcut({ code: "KeyK", withModifier: true }, openSearch);
  useShortcut({ code: "KeyQ" }, openQuickAdd);
  useSyncPolling();
  const actions = { onOpenSearch: openSearch, onOpenQuickAdd: openQuickAdd, onNewProject: openNewProject };

  return (
    <QuickAddContext value={openQuickAddWith}>
      <div className="flex min-h-dvh bg-bg text-fg">
        <AppDndContext>
          <DesktopSidebar {...actions} />
          <div className="flex min-w-0 flex-1 flex-col pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0">
            <MobileTopBar menuOpen={openDialog === "drawer"} onOpenMenu={openDrawer} />
            <Outlet />
          </div>
        </AppDndContext>
        <MobileBottomBar onOpenSearch={openSearch} onOpenQuickAdd={openQuickAdd} />

        {openDialog === "drawer" && <MobileDrawer onClose={closeDialog} {...actions} />}
        {openDialog === "search" && <SearchDialog onClose={closeDialog} />}
        {openDialog === "quickAdd" && <QuickAddDialog defaults={quickAddDefaults} onClose={closeDialog} />}
        {openDialog === "newProject" && <NewProjectDialog onClose={closeDialog} />}
        <TaskDrawer />
      </div>
    </QuickAddContext>
  );
}
