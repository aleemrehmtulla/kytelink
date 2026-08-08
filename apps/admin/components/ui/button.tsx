import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type ButtonTone =
  "primary" | "secondary" | "danger" | "warning" | "success" | "ghost";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> {
  tone?: ButtonTone;
  size?: ButtonSize;
  busy?: boolean;
  icon?: ReactNode;
  full?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const TONE_CLASSES: Record<ButtonTone, string> = {
  primary: "bg-accent text-white not-disabled:hover:bg-accent-hover",
  secondary: "border border-border bg-card text-secondary not-disabled:hover:bg-tint not-disabled:hover:text-ink",
  danger: "border border-danger-border bg-card text-danger not-disabled:hover:bg-danger-soft",
  warning: "border border-warning-border bg-card text-warning not-disabled:hover:bg-warning-soft",
  success: "border border-success-border bg-card text-success not-disabled:hover:bg-success-soft",
  ghost: "text-secondary not-disabled:hover:bg-tint not-disabled:hover:text-ink",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-[12px] gap-1.5",
  md: "px-4 py-1.5 text-[13px] gap-2",
};

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export function Button({
  tone = "secondary",
  size = "md",
  busy = false,
  icon,
  full = false,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`relative rounded-pill inline-flex shrink-0 cursor-pointer items-center justify-center font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${full ? "w-full" : ""}`}
    >
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      ) : null}
      <span className={`contents ${busy ? "invisible" : ""}`}>
        {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
        {children}
      </span>
    </button>
  );
}
