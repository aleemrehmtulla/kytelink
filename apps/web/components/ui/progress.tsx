import { forwardRef } from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/cn";

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  indicatorClassName?: string;
}

export const Progress = forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  function Progress({ className, value = 0, indicatorClassName, ...props }, ref) {
    const clamped = Math.min(100, Math.max(0, value));
    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={clamped}
        className={cn("relative h-2 w-full overflow-hidden rounded-pill bg-tint-hover", className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn("h-full w-full flex-1 rounded-pill bg-accent transition-all", indicatorClassName)}
          style={{ transform: `translateX(-${100 - clamped}%)` }}
        />
      </ProgressPrimitive.Root>
    );
  },
);
