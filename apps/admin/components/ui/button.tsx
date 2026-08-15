import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";
import Link from "next/link";

type ButtonTone = "primary" | "secondary" | "danger" | "warning" | "success" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonBaseProps {
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: ReactNode;
  full?: boolean;
}

// `busy` lives on Button only: an anchor cannot be disabled, so a "busy link"
// would be a spinner that still navigates — the state is left unrepresentable.
export interface ButtonProps
  extends ButtonBaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  busy?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export interface ButtonLinkProps
  extends
    ButtonBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> {
  href: string;
  /** Opens in a new tab with the right rel — for live URLs a review must not lose its place over. */
  external?: boolean;
}

const TONE_CLASSES: Record<ButtonTone, string> = {
  primary: "bg-accent text-white not-disabled:hover:bg-accent-hover",
  secondary:
    "border border-border bg-card text-secondary not-disabled:hover:bg-tint not-disabled:hover:text-ink",
  danger:
    "border border-danger-border bg-card text-danger not-disabled:hover:bg-danger-soft",
  warning:
    "border border-warning-border bg-card text-warning not-disabled:hover:bg-warning-soft",
  success:
    "border border-success-border bg-card text-success not-disabled:hover:bg-success-soft",
  ghost: "text-secondary not-disabled:hover:bg-tint not-disabled:hover:text-ink",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-[12px] gap-1.5",
  md: "px-4 py-1.5 text-[13px] gap-2",
};

// `full` drops the shrink-0 so two full buttons can share one flex row and
// split it evenly instead of overflowing.
function shellClasses({
  tone = "secondary",
  size = "md",
  full = false,
}: ButtonBaseProps): string {
  return `relative rounded-pill inline-flex cursor-pointer items-center justify-center font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${full ? "w-full min-w-0" : "shrink-0"}`;
}

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

function Body({
  busy = false,
  icon,
  children,
}: {
  busy?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      ) : null}
      <span className={`contents ${busy ? "invisible" : ""}`}>
        {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
        {children}
      </span>
    </>
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
      className={shellClasses({ tone, size, full })}
    >
      <Body busy={busy} icon={icon}>
        {children}
      </Body>
    </button>
  );
}

/** The same pill as Button, rendered as a link — actions and navigations in one
 * row must be indistinguishable, so both come from the same shell. */
export function ButtonLink({
  tone = "secondary",
  size = "md",
  icon,
  full = false,
  href,
  external = false,
  children,
  ...rest
}: ButtonLinkProps) {
  const className = shellClasses({ tone, size, full });
  const body = <Body icon={icon}>{children}</Body>;
  if (external) {
    return (
      <a
        {...rest}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={className}
      >
        {body}
      </a>
    );
  }
  return (
    <Link {...rest} href={href} className={className}>
      {body}
    </Link>
  );
}
