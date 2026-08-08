import type { ReactNode } from "react";

export interface ChartCardProps {
  title: string;
  hint?: string;
  children: ReactNode;
}

export function ChartCard({ title, hint, children }: ChartCardProps) {
  return (
    <section className="rounded-card border-cardline bg-card text-ink border p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-ink text-[13px] font-semibold">{title}</h2>
        {hint ? <span className="text-tertiary text-[12px]">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}
