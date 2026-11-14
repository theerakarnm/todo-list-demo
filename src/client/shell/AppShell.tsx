import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { DesktopSidebar } from "./DesktopSidebar";
import { PlaceholderDialog } from "./PlaceholderDialog";
import { useShortcut } from "./use-shortcut";

type OpenDialog = "search" | "quickAdd" | null;

/** Layout of every signed-in screen: sidebar on desktop, the page on the right. */
export default function AppShell() {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  const openSearch = useCallback(() => setOpenDialog("search"), []);
  const openQuickAdd = useCallback(() => setOpenDialog("quickAdd"), []);
  const closeDialog = useCallback(() => setOpenDialog(null), []);

  useShortcut({ code: "KeyK", withModifier: true }, openSearch);
  useShortcut({ code: "KeyQ" }, openQuickAdd);

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <DesktopSidebar onOpenSearch={openSearch} onOpenQuickAdd={openQuickAdd} />
      <Outlet />

      {openDialog === "search" && <PlaceholderDialog title={t("nav.search")} onClose={closeDialog} />}
      {openDialog === "quickAdd" && <PlaceholderDialog title={t("nav.addTask")} onClose={closeDialog} />}
    </div>
  );
}
