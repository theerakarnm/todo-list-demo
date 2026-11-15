import type { ReactNode } from "react";

/** The ruled header above a group of tasks, e.g. "วันนี้ - 6", with an optional action on the right. */
export function GroupHeading({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="group-heading">
      <h2 className="mono m-0 font-semibold">{label}</h2>
      {children}
    </div>
  );
}
