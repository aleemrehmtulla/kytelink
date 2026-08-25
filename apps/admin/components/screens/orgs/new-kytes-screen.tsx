import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { ModerationStatusPill, StatusPill } from "../../ui/status-pill";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { formatDate, formatNumber, nonBlank } from "../../../lib/format";
import type { RecentKyteRow } from "../../../lib/admin-source";

type Days = 7 | 30 | 90;
const DAY_OPTIONS: readonly Days[] = [7, 30, 90];

const CHIP = "rounded-pill cursor-pointer border px-3 py-1 text-[12px] font-medium";
const CHIP_ON = "border-accent bg-accent text-white";
const CHIP_OFF = "border-border bg-card text-secondary hover:bg-tint hover:text-ink";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date, now: Date): string {
  const key = localDayKey(date);
  if (key === localDayKey(now)) return "Today";
  if (key === localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) {
    return "Yesterday";
  }
  return formatDate(date.toISOString());
}

interface DayGroup {
  key: string;
  label: string;
  rows: RecentKyteRow[];
}

function groupByDay(rows: RecentKyteRow[], now: Date): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const row of rows) {
    const date = new Date(row.createdAt);
    const key = localDayKey(date);
    const current = groups[groups.length - 1];
    if (current && current.key === key) current.rows.push(row);
    else groups.push({ key, label: dayLabel(date, now), rows: [row] });
  }
  return groups;
}

function KyteRow({ row }: { row: RecentKyteRow }) {
  const name = nonBlank(row.displayName);
  const owner = nonBlank(row.ownerEmail);
  return (
    <Link
      href={`/orgs/${row.orgId}/${row.id}`}
      className="hover:bg-tint flex h-12 items-center gap-3 px-4 transition-colors"
    >
      <span className="text-tertiary w-[4.5rem] shrink-0 text-[12px] whitespace-nowrap tabular-nums">
        {timeFormatter.format(new Date(row.createdAt))}
      </span>
      <span className="text-ink min-w-0 shrink-0 truncate text-[13px] font-medium sm:max-w-[220px]">
        {row.username ? `/${row.username}` : "no username yet"}
      </span>
      <span className="text-tertiary hidden min-w-0 flex-1 truncate text-[12px] sm:block">
        {name ?? ""}
      </span>
      <span className="text-faint hidden min-w-0 max-w-[240px] truncate text-[12px] lg:block">
        {owner ?? (row.personalOrg ? "" : row.orgName)}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1.5">
        {row.moderationStatus === "SUSPENDED" ? (
          <ModerationStatusPill status={row.moderationStatus} />
        ) : row.published ? (
          <StatusPill label="Published" tone="success" />
        ) : (
          <StatusPill label="Draft" tone="neutral" />
        )}
      </span>
    </Link>
  );
}

function useDays(): { days: Days; setDays: (next: Days) => void } {
  const router = useRouter();
  const raw = router.query.d;
  const days = useMemo<Days>(
    () => DAY_OPTIONS.find((option) => String(option) === raw) ?? 7,
    [raw],
  );
  const setDays = useCallback(
    (next: Days) => {
      void router.replace({ pathname: router.pathname, query: { d: String(next) } }, undefined, {
        shallow: true,
      });
    },
    [router],
  );
  return { days, setDays };
}

export function NewKytesScreen() {
  const { days, setDays } = useDays();
  const source = useAdminSource();
  const fetchRecent = useCallback(() => source.recentKytes({ days }), [source, days]);
  const recent = useAsync(fetchRecent);
  const groups = useMemo(
    () => (recent.data ? groupByDay(recent.data.rows, new Date()) : []),
    [recent.data],
  );

  const header = (
    <>
      <PageHeader
        title="New kytes"
        description="Every kyte created recently, newest first, grouped by day."
      />
      <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Range">
        {DAY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={days === option}
            onClick={() => setDays(option)}
            className={`${CHIP} ${days === option ? CHIP_ON : CHIP_OFF}`}
          >
            {option}d
          </button>
        ))}
      </div>
    </>
  );

  if (recent.status === "loading" && !recent.data) {
    return (
      <>
        {header}
        <LoadingState rows={8} />
      </>
    );
  }

  if (recent.status === "error" || !recent.data) {
    return (
      <>
        {header}
        <ErrorState message="Couldn't load recent kytes." onRetry={recent.reload} />
      </>
    );
  }

  const { rows, total, capped } = recent.data;

  if (rows.length === 0) {
    return (
      <>
        {header}
        <EmptyState title={`No kytes created in the last ${days} days`} />
      </>
    );
  }

  return (
    <>
      {header}
      <p className="text-tertiary mb-3 text-[12px] tabular-nums">
        {formatNumber(total)} kyte{total === 1 ? "" : "s"} in the last {days} days
        {capped ? ` — showing the newest ${formatNumber(rows.length)}` : ""}
      </p>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <section key={group.key} aria-label={group.label}>
            <div className="text-faint mb-1.5 flex items-baseline gap-2 px-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
              {group.label}
              <span className="text-ghost font-normal tracking-normal normal-case tabular-nums">
                {formatNumber(group.rows.length)}
              </span>
            </div>
            <div className="border-cardline bg-card divide-hairline flex flex-col divide-y overflow-hidden rounded-card border">
              {group.rows.map((row) => (
                <KyteRow key={row.id} row={row} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
