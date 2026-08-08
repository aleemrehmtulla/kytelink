import type { ReactNode } from "react";

export interface CardProps {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, hint, action, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-card border-cardline bg-card border p-5 ${className}`}>
      {title || action || hint ? (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title ? (
            <h2 className="text-ink text-[13px] font-semibold">{title}</h2>
          ) : (
            <span />
          )}
          {hint ? <span className="text-tertiary text-[12px]">{hint}</span> : null}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
