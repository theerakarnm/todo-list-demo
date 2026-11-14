import type { ReactNode } from "react";

/** Main column of a signed-in page: same padding and max width as the mockups. */
export function AppPage({ children }: { children: ReactNode }) {
  return (
    <main className="min-w-0 flex-1 px-[clamp(20px,4vw,56px)] pt-8 pb-16">
      <div className="max-w-[940px]">{children}</div>
    </main>
  );
}
