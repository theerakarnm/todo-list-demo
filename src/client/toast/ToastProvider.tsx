import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";

/** Undo is offered for this long (ARCHITECTURE §7). */
export const TOAST_DURATION_MS = 5000;

export type ToastInput = {
  message: string;
  /** Shows an Undo button that runs this (the reverse server call). */
  onUndo?: () => void;
  tone?: "info" | "error";
};

type Toast = ToastInput & { id: number };

const ToastContext = createContext<{ showToast: (toast: ToastInput) => void } | null>(null);

/** The newest toasts on screen at once; older ones make room. */
const MAX_TOASTS = 3;

/** Holds the toasts and shows them above the page, bottom left (above the bottom bar on mobile). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...input, id }].slice(-MAX_TOASTS));
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext value={value}>
      {children}
      <div role="status" aria-label={t("toast.region")} className="toast-region">
        {toasts.map((toast) => (
          <div key={toast.id} className={toast.tone === "error" ? "toast toast-error" : "toast"}>
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.onUndo && (
              <button
                type="button"
                className="toast-undo mono"
                onClick={() => {
                  dismiss(toast.id);
                  toast.onUndo?.();
                }}
              >
                {t("toast.undo")}
              </button>
            )}
            <button
              type="button"
              className="icon-button toast-close"
              aria-label={t("toast.dismiss")}
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast needs a <ToastProvider>");
  return context;
}
