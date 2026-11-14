import type { ReactNode } from "react";

/** Inline error under a field or a form, with the orange warning triangle from the Login mockup. */
export function FormError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="form-error" role="alert">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-[3px] flex-none">
        <path d="M8 2 L15 14 H1 Z" fill="var(--ink-orange)" stroke="var(--ink-black)" strokeWidth="1.5" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
