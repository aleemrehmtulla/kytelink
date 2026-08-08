export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Read by screen readers; the visible text is the caller's business. */
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`rounded-pill relative inline-flex h-5 w-[34px] shrink-0 cursor-pointer items-center border transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-accent bg-accent" : "border-border bg-tint-hover"
      }`}
    >
      <span
        aria-hidden="true"
        className={`rounded-pill absolute h-4 w-4 bg-white transition-[left] duration-100 ${
          checked ? "left-[15px]" : "left-[1px]"
        }`}
      />
    </button>
  );
}
