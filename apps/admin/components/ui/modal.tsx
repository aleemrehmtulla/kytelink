import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { Portal } from "./portal";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children?: ReactNode;
}

type ModalSize = NonNullable<ModalProps["size"]>;

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[560px]",
  lg: "max-w-[760px]",
};

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
];

const FOCUSABLE = FOCUSABLE_SELECTORS.join(",");
const FOCUSABLE_NOT_DISMISS = FOCUSABLE_SELECTORS.map(
  (selector) => `${selector}:not([data-modal-dismiss])`,
).join(",");

let scrollLockDepth = 0;
let previousBodyOverflow = "";

function lockBodyScroll(): () => void {
  if (scrollLockDepth === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockDepth += 1;
  return () => {
    scrollLockDepth = Math.max(0, scrollLockDepth - 1);
    if (scrollLockDepth === 0) document.body.style.overflow = previousBodyOverflow;
  };
}

function visibleFocusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => node.offsetParent !== null || node === document.activeElement,
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const release = lockBodyScroll();
    const panel = panelRef.current;
    const target =
      panel?.querySelector<HTMLElement>(FOCUSABLE_NOT_DISMISS) ??
      panel?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel;
    target?.focus();
    return () => {
      release();
      opener?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // An open dropdown owns Escape first; it lives in its own portal.
        if (document.activeElement?.closest('[role="menu"]')) return;
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = visibleFocusables(panel);
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
        <div
          className="bg-ink/25 absolute inset-0"
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={`rounded-menu border-cardline bg-card shadow-menu relative my-auto flex max-h-[calc(100dvh-1.5rem)] w-full flex-col border sm:max-h-[calc(100dvh-3rem)] ${SIZE_CLASSES[size]}`}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-ink text-[14px] font-semibold">
                {title}
              </h2>
              {description ? (
                <p
                  id={descriptionId}
                  className="text-secondary mt-1 text-[13px] leading-relaxed"
                >
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              data-modal-dismiss=""
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-pill text-tertiary hover:bg-tint hover:text-ink -mt-1 -mr-1 shrink-0 cursor-pointer px-2 py-1 text-[16px] leading-none"
            >
              ×
            </button>
          </div>
          {children ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          ) : null}
          {footer ? (
            <div className="border-hairline flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </Portal>
  );
}
