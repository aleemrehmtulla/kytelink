import type { UserStatus } from "@kytelink/schemas";

export type UserStatusFilterValue = UserStatus | "ALL";

const OPTIONS: { value: UserStatusFilterValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
];

export interface UserStatusFilterProps {
  value: UserStatusFilterValue;
  onChange: (next: UserStatusFilterValue) => void;
}

export function UserStatusFilter({ value, onChange }: UserStatusFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter by account status"
      className="inline-flex items-center gap-0.5 rounded-pill border border-border bg-card p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-pill px-3 py-1 text-[13px] font-medium ${
              active ? "bg-accent-soft text-accent" : "text-tertiary hover:bg-tint hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
