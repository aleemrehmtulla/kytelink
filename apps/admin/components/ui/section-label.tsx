import type { ReactNode } from "react";

export interface SectionLabelProps {
  children: ReactNode;
  hint?: string;
}

export function SectionLabel({ children, hint }: SectionLabelProps) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="text-tertiary text-[11px] font-semibold tracking-[0.08em] uppercase">
        {children}
      </h2>
      {hint ? <span className="text-faint text-[12px]">{hint}</span> : null}
    </div>
  );
}
