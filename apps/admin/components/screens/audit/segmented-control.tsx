interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-pill border border-border bg-card p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-pill px-3 py-1 text-[13px] font-medium ${
              active ? "bg-accent text-accent-fg" : "text-secondary hover:bg-tint"
            }`}
          >
            {option.label}
            {option.count === undefined ? null : (
              <span
                className={`ml-1.5 tabular-nums ${active ? "text-accent-fg/80" : "text-tertiary"}`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
