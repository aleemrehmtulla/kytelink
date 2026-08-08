import type { ReactNode } from "react";

interface DetailListItem {
  label: string;
  value: ReactNode;
  hint?: string;
}

export interface DetailListProps {
  items: DetailListItem[];
}

export function DetailList({ items }: DetailListProps) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-hairline flex flex-col gap-0.5 border-b py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
        >
          <dt className="text-tertiary shrink-0 text-[12px]">
            {item.label}
            {item.hint ? (
              <span className="text-faint ml-1.5 text-[11px]" title={item.hint}>
                ⓘ
              </span>
            ) : null}
          </dt>
          <dd className="text-ink min-w-0 text-[13px] font-medium break-words [font-variant-numeric:tabular-nums] sm:text-right">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
