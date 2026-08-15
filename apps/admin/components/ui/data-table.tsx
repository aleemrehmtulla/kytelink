import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { Pagination } from "./pagination";

type ColumnMobileRole = "title" | "meta" | "detail" | "hidden" | "actions";

export interface Column<Row> {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  width?: string;
  sortKey?: string;
  cell: (row: Row) => ReactNode;
  mobile?: ColumnMobileRole;
  headerHint?: string;
}

interface DataTableSelection<Row> {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: (row: Row) => boolean;
}

interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface DataTableProps<Row> {
  rows: Row[];
  columns: Column<Row>[];
  rowKey: (row: Row) => string;
  status: "loading" | "success" | "error";
  onRetry?: () => void;
  empty?: { title: string; description?: string; action?: ReactNode };
  sort?: { key: string; dir: "asc" | "desc" };
  onSortChange?: (key: string, dir: "asc" | "desc") => void;
  href?: (row: Row) => string;
  /** Row click for in-place detail (e.g. an asset viewer). Ignored when `href` is set. */
  onRowClick?: (row: Row) => void;
  selection?: DataTableSelection<Row>;
  pagination: DataTablePagination;
  toolbar?: ReactNode;
  bulkBar?: ReactNode;
  density?: "comfortable" | "compact";
  caption?: string;
  /** Plural noun for the pagination summary: "Showing 26–50 of 312 users". */
  unit?: string;
}

const CELL_PADDING = {
  comfortable: "px-3 py-2.5",
  compact: "px-3 py-1.5",
} as const;

// The pagination row has to be on screen at first paint on a laptop, so the
// scroll body is capped by what the surrounding chrome consumes: top bar 57,
// main padding 56, page header 76, bare toolbar row + gap 50, pagination row
// 45, card borders 2, slack 14 = 300px. The max() floor keeps ~8 rows visible
// on short viewports without padding out tables that have fewer rows.
const SCROLL_CAP = "max-h-[max(320px,calc(100dvh-300px))]";

const NUMERIC = "text-right [font-variant-numeric:tabular-nums]";
const INTERACTIVE_SELECTOR = "a,button,input,select,textarea,label,[data-no-row-nav]";

function Checkbox({
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(event.target.checked)}
      className="accent-accent h-4 w-4 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

function SortHeader({
  header,
  active,
  dir,
  onToggle,
}: {
  header: ReactNode;
  active: boolean;
  dir: "asc" | "desc";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex cursor-pointer items-center gap-1 ${active ? "text-ink" : "hover:text-ink"}`}
    >
      {header}
      <span className={active ? "text-accent" : "text-ghost"} aria-hidden="true">
        {active ? (dir === "asc" ? "▴" : "▾") : "↕"}
      </span>
    </button>
  );
}

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  status,
  onRetry,
  empty,
  sort,
  onSortChange,
  href,
  onRowClick,
  selection,
  pagination,
  toolbar,
  bulkBar,
  density = "compact",
  caption,
  unit = "rows",
}: DataTableProps<Row>) {
  const router = useRouter();
  const padding = CELL_PADDING[density];

  const hasRows = rows.length > 0;
  const firstLoad = status === "loading" && !hasRows;
  const dimmed = status === "loading" && hasRows;
  const chromeless = status === "error" || (!hasRows && !firstLoad);

  const selectableKeys = selection
    ? rows.filter((row) => !selection.disabled?.(row)).map(rowKey)
    : [];
  const selectedOnPage = selectableKeys.filter((key) =>
    selection?.selected.has(key),
  ).length;
  const allSelected =
    selectableKeys.length > 0 && selectedOnPage === selectableKeys.length;
  const someSelected = selectedOnPage > 0 && !allSelected;
  const selectionActive = (selection?.selected.size ?? 0) > 0;

  function toggleAll(next: boolean) {
    if (!selection) return;
    const updated = new Set(selection.selected);
    for (const key of selectableKeys) {
      if (next) updated.add(key);
      else updated.delete(key);
    }
    selection.onChange(updated);
  }

  function toggleRow(key: string, next: boolean) {
    if (!selection) return;
    const updated = new Set(selection.selected);
    if (next) updated.add(key);
    else updated.delete(key);
    selection.onChange(updated);
  }

  function navigate(event: ReactMouseEvent<HTMLElement>, row: Row) {
    const target = event.target;
    if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) return;
    if (!href) {
      onRowClick?.(row);
      return;
    }
    const url = href(row);
    if (event.metaKey || event.ctrlKey || event.button === 1) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    void router.push(url);
  }

  const rowsClickable = Boolean(href || onRowClick);

  const titleHinted = columns.filter((column) => column.mobile === "title");
  const firstColumn = columns[0];
  const titleColumns =
    titleHinted.length > 0
      ? titleHinted
      : firstColumn
        ? [firstColumn]
        : ([] as Column<Row>[]);
  const metaColumns = columns.filter((column) => column.mobile === "meta");
  const actionsColumn = columns.find((column) => column.mobile === "actions");
  const detailColumns = columns.filter(
    (column) =>
      (column.mobile ?? "detail") === "detail" && !titleColumns.includes(column),
  );
  const primaryIndex = Math.max(
    0,
    columns.findIndex((column) => column === titleColumns[0]),
  );

  const bulkActive = selectionActive && Boolean(bulkBar);

  const paginationRow = (
    <Pagination
      page={pagination.page}
      pageSize={pagination.pageSize}
      total={pagination.total}
      onPageChange={pagination.onPageChange}
      onPageSizeChange={pagination.onPageSizeChange}
      label={unit}
    />
  );

  return (
    <div className="flex flex-col gap-3" aria-busy={status === "loading" || undefined}>
      {bulkActive ? (
        <div className="rounded-card border-accent-border bg-accent-soft sticky top-0 z-20 border px-3 py-2">
          {bulkBar}
        </div>
      ) : (
        toolbar
      )}

      {chromeless ? (
        <>
          {status === "error" ? (
            <ErrorState message="Couldn't load this list." onRetry={onRetry} />
          ) : (
            <EmptyState
              title={empty?.title ?? "Nothing here yet"}
              description={empty?.description}
              action={empty?.action}
              framed
            />
          )}
          <div className="rounded-card border-cardline bg-card border px-3 py-2">
            {paginationRow}
          </div>
        </>
      ) : (
        <div className="rounded-card border-cardline bg-card relative overflow-hidden border">
          {dimmed ? (
            <span
              className="bg-accent absolute inset-x-0 top-0 z-30 h-[2px]"
              role="progressbar"
              aria-label="Loading"
            />
          ) : null}

          {firstLoad ? (
            <div className="p-4">
              <LoadingState rows={6} />
            </div>
          ) : (
            <div className={dimmed ? "pointer-events-none opacity-60" : undefined}>
              <div className={`hidden overflow-x-auto overflow-y-auto md:block ${SCROLL_CAP}`}>
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <caption className="sr-only">{caption ?? "Results"}</caption>
                  <colgroup>
                    {selection ? <col style={{ width: "40px" }} /> : null}
                    {columns.map((column) => (
                      <col
                        key={column.key}
                        style={column.width ? { width: column.width } : undefined}
                      />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      {selection ? (
                        <th
                          scope="col"
                          data-no-row-nav=""
                          className="border-cardline bg-card sticky top-0 z-10 border-b px-3 py-2"
                        >
                          <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            disabled={selectableKeys.length === 0}
                            onChange={toggleAll}
                            label="Select all rows on this page"
                          />
                        </th>
                      ) : null}
                      {columns.map((column) => {
                        const active = Boolean(
                          column.sortKey && sort && sort.key === column.sortKey,
                        );
                        const sortable = Boolean(column.sortKey && onSortChange);
                        return (
                          <th
                            key={column.key}
                            scope="col"
                            title={column.headerHint}
                            aria-sort={
                              sortable
                                ? active
                                  ? sort?.dir === "asc"
                                    ? "ascending"
                                    : "descending"
                                  : "none"
                                : undefined
                            }
                            className={`border-cardline bg-card text-tertiary sticky top-0 z-10 border-b px-3 py-2 text-[12px] font-medium ${
                              column.align === "right" ? "text-right" : "text-left"
                            }`}
                          >
                            {sortable && column.sortKey ? (
                              <SortHeader
                                header={column.header}
                                active={active}
                                dir={active && sort ? sort.dir : "desc"}
                                onToggle={() => {
                                  const key = column.sortKey;
                                  if (!key || !onSortChange) return;
                                  onSortChange(
                                    key,
                                    active && sort?.dir === "desc" ? "asc" : "desc",
                                  );
                                }}
                              />
                            ) : (
                              column.header
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const key = rowKey(row);
                      const rowHref = href?.(row);
                      return (
                        <tr
                          key={key}
                          onClick={rowsClickable ? (event) => navigate(event, row) : undefined}
                          className={`hover:bg-tint ${rowsClickable ? "cursor-pointer" : ""} ${
                            selection?.selected.has(key) ? "bg-accent-soft/60" : ""
                          }`}
                        >
                          {selection ? (
                            <td
                              data-no-row-nav=""
                              className={`border-hairline border-b ${padding}`}
                            >
                              <Checkbox
                                checked={selection.selected.has(key)}
                                disabled={selection.disabled?.(row) ?? false}
                                onChange={(next) => toggleRow(key, next)}
                                label={`Select row ${key}`}
                              />
                            </td>
                          ) : null}
                          {columns.map((column, index) => {
                            const content = column.cell(row);
                            const isActions = column.mobile === "actions";
                            return (
                              <td
                                key={column.key}
                                data-no-row-nav={isActions ? "" : undefined}
                                className={`border-hairline text-secondary border-b ${padding} ${
                                  column.align === "right" ? NUMERIC : ""
                                } ${isActions ? "text-right" : ""}`}
                              >
                                {rowHref && index === primaryIndex ? (
                                  <Link
                                    href={rowHref}
                                    className="text-ink block cursor-pointer truncate"
                                  >
                                    {content}
                                  </Link>
                                ) : (
                                  content
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="flex flex-col gap-2 p-2 md:hidden">
                {rows.map((row) => {
                  const key = rowKey(row);
                  const rowHref = href?.(row);
                  const headline = (
                    <>
                      {titleColumns.map((column) => (
                        <div
                          key={column.key}
                          className="text-ink truncate text-[14px] font-semibold"
                        >
                          {column.cell(row)}
                        </div>
                      ))}
                      {metaColumns.length > 0 ? (
                        <div className="text-tertiary mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
                          {metaColumns.map((column) => (
                            <span key={column.key} className="min-w-0 truncate">
                              {column.cell(row)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </>
                  );
                  return (
                    <li
                      key={key}
                      onClick={rowsClickable ? (event) => navigate(event, row) : undefined}
                      className={`rounded-card border-cardline bg-card border p-3 ${rowsClickable ? "cursor-pointer" : ""} ${
                        selection?.selected.has(key)
                          ? "border-accent-border bg-accent-soft/50"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {selection ? (
                          <div data-no-row-nav="" className="pt-0.5">
                            <Checkbox
                              checked={selection.selected.has(key)}
                              disabled={selection.disabled?.(row) ?? false}
                              onChange={(next) => toggleRow(key, next)}
                              label={`Select row ${key}`}
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          {rowHref ? (
                            <Link href={rowHref} className="block min-w-0 cursor-pointer">
                              {headline}
                            </Link>
                          ) : (
                            headline
                          )}
                        </div>
                        {actionsColumn ? (
                          <div data-no-row-nav="" className="shrink-0">
                            {actionsColumn.cell(row)}
                          </div>
                        ) : null}
                      </div>
                      {detailColumns.length > 0 ? (
                        <dl className="border-hairline mt-2.5 flex flex-col gap-1 border-t pt-2.5">
                          {detailColumns.map((column) => (
                            <div
                              key={column.key}
                              className="flex items-baseline justify-between gap-3"
                            >
                              <dt className="text-tertiary shrink-0 text-[12px]">
                                {column.header}
                              </dt>
                              <dd className="text-secondary min-w-0 text-right text-[12px] [font-variant-numeric:tabular-nums]">
                                {column.cell(row)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="border-hairline border-t px-3 py-2">{paginationRow}</div>
        </div>
      )}
    </div>
  );
}
