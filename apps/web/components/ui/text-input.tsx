import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export interface TextInputProps extends ComponentProps<"input"> {
  label?: string;
  hint?: string;
  error?: string | null;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  status?: "default" | "valid" | "invalid";
}

export function TextInput({
  label,
  hint,
  error,
  leftAddon,
  rightAddon,
  status = "default",
  className = "",
  id,
  ...rest
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const borderColor =
    status === "valid"
      ? "border-success"
      : status === "invalid" || error
        ? "border-danger"
        : "border-border";

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <div className={cn("flex items-center overflow-hidden rounded-input border bg-card", borderColor)}>
        {leftAddon ? (
          <span className="shrink-0 whitespace-nowrap pl-3.5 text-[13px] text-muted-foreground">{leftAddon}</span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            "h-[42px] w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-subtle-foreground",
            leftAddon ? "pl-1 pr-3.5" : "px-3.5",
            className,
          )}
          {...rest}
        />
        {rightAddon ? <span className="whitespace-nowrap px-3 text-sm text-muted-foreground">{rightAddon}</span> : null}
      </div>
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
