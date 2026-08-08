import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import { toastMotion } from "@kytelink/ui";
import { cn } from "@/lib/cn";

export type ToastTone = "default" | "success" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

const TONE_ICON = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
} as const;

const TONE_ICON_COLOR: Record<ToastTone, string> = {
  default: "text-subtle-foreground",
  success: "text-success",
  error: "text-danger",
};

export interface ToasterProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function Toaster({ toasts, onDismiss }: ToasterProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout
              variants={toastMotion}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-card border border-cardline bg-card px-4 py-3 text-sm text-foreground shadow-menu"
            >
              <Icon className={cn("size-4 shrink-0", TONE_ICON_COLOR[toast.tone])} />
              <span className="min-w-0 flex-1">{toast.message}</span>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss(toast.id);
                  }}
                  className="shrink-0 cursor-pointer font-medium text-accent hover:underline"
                >
                  {toast.action.label}
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 cursor-pointer text-subtle-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
