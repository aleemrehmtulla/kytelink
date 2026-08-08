import type { ReactNode } from "react";

export interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  disabled?: boolean;
}

export function FilterChip({ active, onClick, children, count, disabled = false }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={`cursor-pointer rounded-pill border px-3 py-1 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-accent-border bg-accent-soft text-accent"
          : "border-border bg-card text-tertiary not-disabled:hover:bg-tint"
      }`}
    >
      {children}
      {count !== undefined ? (
        <span className={`ml-1.5 tabular-nums ${active ? "text-accent" : "text-faint"}`}>{count}</span>
      ) : null}
    </button>
  );
}
