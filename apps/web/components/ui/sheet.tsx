import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "bottom";
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
}: SheetProps) {
  const positionClass =
    side === "bottom"
      ? "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-menu border-t"
      : "inset-y-0 right-0 w-full max-w-md border-l";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content
          aria-label={title}
          className={cn(
            "border-cardline bg-card shadow-menu fixed z-50 flex flex-col overflow-hidden outline-none",
            positionClass,
          )}
        >
          <div className="border-hairline flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title
                className={cn(
                  "text-foreground text-base font-semibold",
                  !title && "sr-only",
                )}
              >
                {title ?? "Panel"}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-muted-foreground mt-0.5 truncate text-sm">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="text-muted-foreground hover:bg-tint hover:text-foreground cursor-pointer rounded-md p-1 transition-colors"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-y-none px-5 py-4">
            {children}
          </div>
          {footer ? (
            <div className="border-hairline border-t px-5 py-4">{footer}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
