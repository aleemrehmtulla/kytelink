import { PAGE_SIZES } from "@kytelink/schemas";
import { formatNumber } from "../../lib/format";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  label?: string;
}

const WINDOW_RADIUS = 2;

type PageEntry = number | "gap";

function pageEntries(page: number, pageCount: number): PageEntry[] {
  const wanted = new Set<number>([1, pageCount]);
  for (let offset = -WINDOW_RADIUS; offset <= WINDOW_RADIUS; offset += 1) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= pageCount) wanted.add(candidate);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const entries: PageEntry[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous !== 0 && value - previous > 1) entries.push("gap");
    entries.push(value);
    previous = value;
  }
  return entries;
}

const PILL = "cursor-pointer rounded-pill px-2.5 py-1 text-[12px] font-medium";
const STEP = `${PILL} border border-border bg-card text-secondary not-disabled:hover:bg-tint not-disabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-40`;

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  label = "rows",
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const current = Math.min(Math.max(1, page), pageCount);
  const first = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = total === 0 ? 0 : Math.min(total, current * pageSize);
  const entries = pageEntries(current, pageCount);

  const summary =
    total === 0
      ? `Showing 0 of 0 ${label}`
      : `Showing ${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(total)} ${label}`;

  const sizeSelect = onPageSizeChange ? (
    <label className="text-tertiary flex items-center gap-1.5 text-[12px]">
      <span className="hidden sm:inline">Per page</span>
      <select
        value={pageSize}
        onChange={(event) => onPageSizeChange(Number(event.target.value))}
        aria-label="Rows per page"
        className="rounded-input border-border bg-card text-secondary cursor-pointer border px-2 py-1 text-[12px]"
      >
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  ) : null;

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
      aria-label="Pagination"
    >
      <p className="text-tertiary min-w-0 text-[12px] [font-variant-numeric:tabular-nums]">
        {summary}
      </p>

      <div className="flex items-center gap-2 md:hidden">
        {sizeSelect}
        <button
          type="button"
          aria-label="Previous page"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className={STEP}
        >
          Prev
        </button>
        <span className="text-secondary text-[12px] [font-variant-numeric:tabular-nums]">
          Page {current} of {pageCount}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={current >= pageCount}
          onClick={() => onPageChange(current + 1)}
          className={STEP}
        >
          Next
        </button>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        {sizeSelect}
        <button
          type="button"
          aria-label="Previous page"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className={STEP}
        >
          Prev
        </button>
        <ul className="flex items-center gap-1">
          {entries.map((entry, index) =>
            entry === "gap" ? (
              <li
                key={`gap-${index}`}
                className="text-faint px-1 text-[12px] select-none"
                aria-hidden="true"
              >
                …
              </li>
            ) : (
              <li key={entry}>
                <button
                  type="button"
                  onClick={() => onPageChange(entry)}
                  aria-current={entry === current ? "page" : undefined}
                  className={`${PILL} [font-variant-numeric:tabular-nums] ${
                    entry === current
                      ? "bg-accent text-white"
                      : "text-secondary hover:bg-tint hover:text-ink"
                  }`}
                >
                  {entry}
                </button>
              </li>
            ),
          )}
        </ul>
        <button
          type="button"
          aria-label="Next page"
          disabled={current >= pageCount}
          onClick={() => onPageChange(current + 1)}
          className={STEP}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
