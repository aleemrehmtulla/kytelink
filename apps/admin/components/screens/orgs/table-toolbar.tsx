import type { ReactNode } from "react";
import { SearchIcon } from "../../ui/search-icon";

export interface TableSearchProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  label: string;
}

export function TableSearch({ id, value, onChange, placeholder, label }: TableSearchProps) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-input border border-border bg-card py-2 pl-8 pr-3 text-[13px] text-ink placeholder:text-faint"
      />
    </div>
  );
}

export interface FilterChipsProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}

export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-pill border px-3 py-1 text-[12px] font-medium ${
              active
                ? "border-accent-border bg-accent-soft text-accent"
                : "border-border bg-card text-secondary hover:bg-tint"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
