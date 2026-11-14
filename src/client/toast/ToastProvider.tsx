import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * One toast. Its 5 seconds start again while the pointer or keyboard focus is on it,
 * so there is time to reach Undo (WCAG 2.2.1).
 */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [paused, onDismiss, toast.id]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover and focus only pause the timer; the buttons inside are the controls.
    <div
      className={toast.tone === "error" ? "toast toast-error" : "toast"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setPaused(false)}
    >
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.onUndo && (
        <button
          type="button"
          className="toast-undo mono"
          onClick={() => {
            onDismiss(toast.id);
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
        onClick={() => onDismiss(toast.id)}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

/** Holds the toasts and shows them above the page, bottom centre (above the bottom bar on mobile). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const showToast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...input, id }].slice(-MAX_TOASTS));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const render = (tone: "info" | "error") =>
    toasts
      .filter((toast) => (toast.tone ?? "info") === tone)
      .map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />);

  return (
    <ToastContext value={value}>
      {children}
      <div className="toast-region">
        {/* Errors interrupt the screen reader; other news waits its turn. */}
        <div role="alert" className="toast-stack">
          {render("error")}
        </div>
        <div role="status" aria-label={t("toast.region")} className="toast-stack">
          {render("info")}
        </div>
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast needs a <ToastProvider>");
  return context;
}
