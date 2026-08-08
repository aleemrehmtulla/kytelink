import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /**
   * Draws its own card. Off by default because most empty states sit *inside*
   * a Card or ChartCard, where a second border reads as a box in a box.
   */
  framed?: boolean;
}

export function EmptyState({
  title,
  description,
  action,
  framed = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1 text-center ${
        framed ? "rounded-card border-cardline bg-card border px-5 py-10" : "px-4 py-8"
      }`}
    >
      <p className="text-ink text-[13px] font-medium">{title}</p>
      {description ? (
        <p className="text-tertiary max-w-sm text-[13px] leading-relaxed">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}
