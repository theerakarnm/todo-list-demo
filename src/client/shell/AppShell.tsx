import { Outlet } from "react-router";

/** Layout of the signed-in screens. The sidebar and mobile bars come next. */
export default function AppShell() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <Outlet />
    </div>
  );
}
