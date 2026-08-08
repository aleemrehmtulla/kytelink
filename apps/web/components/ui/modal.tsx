import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 460,
  className,
}: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content
          style={{ maxWidth }}
          aria-label={title}
          className={cn(
            "rounded-menu border-cardline bg-card shadow-menu fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border outline-none",
            className,
          )}
        >
          {title ? (
            <div className="border-hairline flex items-center justify-between gap-4 border-b px-5 py-4">
              <DialogPrimitive.Title className="text-foreground text-base font-semibold">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                className="text-muted-foreground hover:bg-tint hover:text-foreground cursor-pointer rounded-md p-1 transition-colors"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
          ) : (
            <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
          )}
          <div className="overflow-y-auto overscroll-y-none px-5 py-4">{children}</div>
          {footer ? (
            <div className="border-hairline border-t px-5 py-4">{footer}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
