import type { ReactNode } from "react";

export interface SectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({
  title,
  description,
  action,
  children,
  className = "",
}: SectionProps) {
  return (
    <section className={`rounded-card border-cardline bg-card border p-5 ${className}`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-ink text-[13px] font-semibold">{title}</h2>
          {description ? (
            <p className="text-tertiary mt-1 text-[12px] leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{action}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
