import type { ReactNode } from "react";
import Link from "next/link";
import { formatPercentPoints } from "../../lib/format";

type StatTone = "default" | "warning" | "danger" | "accent";

export interface StatItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  delta?: { pct: number; label?: string };
  href?: string;
  tone?: StatTone;
}

const VALUE_TONE: Record<StatTone, string> = {
  default: "text-ink",
  warning: "text-warning",
  danger: "text-danger",
  accent: "text-accent",
};

// `accent` tints the cell so a headline number can lead a group without
// leaving the card — a separate box beside the group never lines up with it.
const CELL_TONE: Record<StatTone, string> = {
  default: "bg-card",
  warning: "bg-card",
  danger: "bg-card",
  accent: "bg-accent-soft",
};

function Delta({ pct, label }: { pct: number; label?: string }) {
  const flat = Math.abs(pct) < 0.05;
  const tone = flat ? "text-tertiary" : pct > 0 ? "text-success" : "text-danger";
  const glyph = flat ? "→" : pct > 0 ? "↑" : "↓";
  return (
    <span className={`text-[12px] font-medium ${tone} [font-variant-numeric:tabular-nums]`}>
      <span aria-hidden="true">{glyph} </span>
      {formatPercentPoints(Math.abs(pct))}
      {label ? <span className="text-tertiary font-normal"> {label}</span> : null}
    </span>
  );
}

type StatSize = "default" | "compact";

// `compact` halves the row's height: smaller numerals, tighter padding, and the
// meta line folded onto the label row instead of stacked under the value. It
// exists for pages that lead with a table — the numbers are context there, not
// the headline.
const SIZE = {
  default: {
    shell: "flex flex-col justify-start gap-2 px-5 py-4",
    value: "text-[28px]",
  },
  compact: {
    shell: "flex flex-col justify-start gap-1 px-4 py-2.5",
    value: "text-[20px]",
  },
} as const;

function Cell({ item, size }: { item: StatItem; size: StatSize }) {
  const tone = item.tone ?? "default";
  const meta = item.delta ? <Delta pct={item.delta.pct} label={item.delta.label} /> : item.sub;
  const body =
    size === "compact" ? (
      <>
        <span className="text-tertiary flex items-center gap-1.5 truncate text-[12px]">
          {item.label}
        </span>
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span
            className={`${SIZE.compact.value} leading-none font-bold tracking-[-0.02em] [font-variant-numeric:tabular-nums] ${VALUE_TONE[tone]}`}
          >
            {item.value}
          </span>
          {meta ? (
            <span className="text-tertiary min-w-0 truncate text-[12px]">{meta}</span>
          ) : null}
        </span>
      </>
    ) : (
      <>
        <span className="text-tertiary flex items-center gap-1.5 text-[12px]">{item.label}</span>
        <span
          className={`${SIZE.default.value} leading-none font-bold tracking-[-0.02em] [font-variant-numeric:tabular-nums] ${VALUE_TONE[tone]}`}
        >
          {item.value}
        </span>
        <span className="text-tertiary min-h-[16px] text-[12px]">{meta}</span>
      </>
    );

  const shell = `${CELL_TONE[tone]} ${SIZE[size].shell}`;

  if (item.href) {
    return (
      <Link href={item.href} className={`${shell} hover:bg-tint cursor-pointer`}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

const COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};

/**
 * A row of related numbers as one card divided by hairlines, rather than N
 * separate boxes — far less border noise on a page that shows twelve of them.
 * The meta line keeps its height whether or not an item has one, so a group
 * is the same height before and after its numbers land.
 */
export function StatGroup({
  items,
  columns = 4,
  size = "default",
}: {
  items: StatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  size?: StatSize;
}) {
  return (
    <div
      className={`rounded-card border-cardline bg-hairline grid gap-px overflow-hidden border ${COLUMNS[columns]}`}
    >
      {items.map((item) => (
        <Cell key={item.key} item={item} size={size} />
      ))}
    </div>
  );
}
