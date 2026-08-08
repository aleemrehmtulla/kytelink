import type { ReactNode } from "react";

export interface ErrorPageProps {
  code: string;
  title: string;
  description: ReactNode;
  actionHref: string;
  actionLabel: string;
  footer?: ReactNode;
  className?: string;
}

// Renders a container, not a <main>: the landing zone mounts this inside
// PageShell, which already owns the page's main landmark.
export function ErrorPage({
  code,
  title,
  description,
  actionHref,
  actionLabel,
  footer,
  className = "",
}: ErrorPageProps) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center px-6 py-16 text-center ${className}`}
    >
      <span
        className="flex size-14 items-center justify-center rounded-card border border-cardline bg-card text-[26px] leading-none"
        aria-hidden="true"
      >
        🪁
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-faint">
        Error {code}
      </p>
      <h1 className="mt-2 text-[32px] font-bold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[40px]">
        {title}
      </h1>
      <div className="mt-3 max-w-md text-[15px] leading-relaxed text-secondary">{description}</div>
      <a
        href={actionHref}
        className="mt-7 inline-flex h-11 cursor-pointer items-center rounded-pill bg-accent px-6 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover"
      >
        {actionLabel}
      </a>
      {footer ? <div className="mt-5 text-sm text-tertiary">{footer}</div> : null}
    </div>
  );
}
