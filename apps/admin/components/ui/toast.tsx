import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Portal } from "./portal";

type ToastTone = "success" | "danger";

export interface ToastOptions {
  tone?: ToastTone;
  undo?: () => void;
}

export interface ToastApi {
  toast: (message: string, opts?: ToastOptions) => void;
}

interface ToastEntry {
  id: number;
  message: string;
  tone: ToastTone;
  undo?: () => void;
}

const PLAIN_TIMEOUT_MS = 4500;
const UNDO_TIMEOUT_MS = 8000;

const noop: ToastApi = { toast: () => {} };

const ToastContext = createContext<ToastApi>(noop);

let nextToastId = 0;

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "border-success-border bg-success-soft text-success",
  danger: "border-danger-border bg-danger-soft text-danger",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, opts?: ToastOptions) => {
      nextToastId += 1;
      const id = nextToastId;
      const entry: ToastEntry = {
        id,
        message,
        tone: opts?.tone ?? "success",
        undo: opts?.undo,
      };
      setEntries((current) => [...current.slice(-3), entry]);
      setTimeout(() => dismiss(id), entry.undo ? UNDO_TIMEOUT_MS : PLAIN_TIMEOUT_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {entries.length > 0 ? (
        <Portal>
          <div
            className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[340px]"
            role="status"
            aria-live="polite"
          >
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-card bg-card shadow-menu pointer-events-auto flex items-start gap-3 border px-3.5 py-2.5 ${TONE_CLASSES[entry.tone]}`}
              >
                <p className="min-w-0 flex-1 text-[13px] leading-snug font-medium">
                  {entry.message}
                </p>
                {entry.undo ? (
                  <button
                    type="button"
                    onClick={() => {
                      entry.undo?.();
                      dismiss(entry.id);
                    }}
                    className="rounded-pill hover:bg-card shrink-0 cursor-pointer border border-current px-2.5 py-0.5 text-[12px] font-medium"
                  >
                    Undo
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => dismiss(entry.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 cursor-pointer px-1 text-[14px] leading-none opacity-60 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Portal>
      ) : null}
    </ToastContext.Provider>
  );
}

/**
 * Falls back to a no-op rather than throwing: a missing provider must not take
 * down a whole screen mid-mutation.
 */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}
