import { cn } from "@/lib/cn";

export interface SpinnerProps {
  size?: number;
  label?: string;
  className?: string;
}

export function Spinner({ size = 20, label = "Loading", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 10)) }}
      className={cn(
        "inline-block shrink-0 animate-[kl-spin_0.6s_linear_infinite] rounded-full border-solid border-border border-t-foreground",
        className,
      )}
    />
  );
}
