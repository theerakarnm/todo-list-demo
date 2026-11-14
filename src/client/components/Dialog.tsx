import { type ReactNode, useEffect, useRef } from "react";

type DialogProps = {
  label: string;
  /** Called after the dialog closed: Esc, a click on the backdrop or a <form method="dialog"> button. */
  onClose: () => void;
  className: string;
  children: ReactNode;
};

/**
 * Modal built on the native <dialog>: the browser traps focus, makes the page
 * behind it inert, closes it on Esc and gives focus back when it closes.
 * Render it only while it should be open.
 */
export function Dialog({ label, onClose, className, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      aria-modal="true"
      className={className}
      onClose={onClose}
      onClick={(event) => {
        // The dialog element itself is only hit through its backdrop; content sits in a child.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      {children}
    </dialog>
  );
}
