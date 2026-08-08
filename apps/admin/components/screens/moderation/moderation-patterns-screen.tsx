import Link from "next/link";
import { useCallback, useState } from "react";
import { Card } from "../../ui/card";
import { ChartCard } from "../../ui/chart-card";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { PageHeader } from "../../ui/page-header";
import { SectionLabel } from "../../ui/section-label";
import { StatGroup } from "../../ui/stat-group";
import { ModerationStatusPill } from "../../ui/status-pill";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { formatNumber, formatRelativeTime } from "../../../lib/format";
import { SeriesChart } from "../traffic/series-chart";
import { ABUSE_REASON_LABELS } from "./moderation-copy";

const WINDOWS = [7, 30, 90] as const;
type Window = (typeof WINDOWS)[number];

const STAT_LABELS = ["Reports", "Still open", "Typical day", "Busiest day"] as const;

function shortDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function BarRow({
  label,
  hint,
  value,
  max,
  tone = "accent",
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: number;
  max: number;
  tone?: "accent" | "warning";
}) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ink min-w-0 truncate text-[13px]">{label}</span>
        <span className="text-secondary shrink-0 text-[12px] tabular-nums">
          {formatNumber(value)}
          {hint ? <span className="text-faint"> · {hint}</span> : null}
        </span>
      </div>
      <span className="rounded-pill bg-tint-hover block h-2 overflow-hidden">
        <span
          className={`rounded-pill block h-full ${tone === "warning" ? "bg-warning" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </li>
  );
}

export function ModerationPatternsScreen() {
  const source = useAdminSource();
  const [days, setDays] = useState<Window>(30);
  const fetchInsights = useCallback(
    () => source.moderationInsights({ days }),
    [source, days],
  );
  const { data, status, reload } = useAsync(fetchInsights);

  const header = (
    <PageHeader
      title="Patterns"
      description={`Where reports come from and who keeps showing up, over the last ${days} days.`}
      action={
        <div
          role="group"
          aria-label="Window"
          className="border-border bg-card rounded-pill flex items-center gap-0.5 border p-0.5"
        >
          {WINDOWS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={days === option}
              onClick={() => setDays(option)}
              className={`rounded-pill cursor-pointer px-2.5 py-1 text-[12px] font-medium ${
                days === option ? "bg-accent-soft text-accent" : "text-tertiary hover:text-ink"
              }`}
            >
              {option}d
            </button>
          ))}
        </div>
      }
    />
  );

  if (status === "loading" && !data) {
    return (
      <>
        {header}
        <StatGroup
          items={STAT_LABELS.map((label) => ({
            key: label,
            label,
            value: <span className="text-ghost">—</span>,
          }))}
        />
      </>
    );
  }

  if (status === "error" || !data) {
    return (
      <>
        {header}
        <ErrorState message="Couldn't load moderation patterns." onRetry={reload} />
      </>
    );
  }

  const counts = data.perDay.map((point) => point.reports);
  const spike =
    data.busiestDate !== null && data.medianPerDay > 0
      ? Math.round((data.busiestCount / data.medianPerDay) * 10) / 10
      : null;

  const reasonMax = data.byReason.reduce((max, row) => Math.max(max, row.reports), 0);
  const domainMax = data.ownerDomains.reduce((max, row) => Math.max(max, row.reports), 0);
  const reporterMax = data.reporters.reduce((max, row) => Math.max(max, row.reports), 0);

  return (
    <>
      {header}

      <div className="mb-6">
        <StatGroup
          items={[
            {
              key: "total",
              label: STAT_LABELS[0],
              value: formatNumber(data.totalInWindow),
              sub: `filed in ${data.days} days`,
            },
            {
              key: "open",
              label: STAT_LABELS[1],
              value: formatNumber(data.openInWindow),
              sub: `${formatNumber(data.actionedInWindow)} already closed`,
              tone: data.openInWindow > 0 ? "warning" : "default",
              href: "/moderation/reports",
            },
            {
              key: "median",
              label: STAT_LABELS[2],
              value: data.medianPerDay.toFixed(1),
              sub: "median reports per day",
            },
            {
              key: "busiest",
              label: STAT_LABELS[3],
              value: data.busiestDate ? formatNumber(data.busiestCount) : "—",
              sub: data.busiestDate
                ? `${shortDate(data.busiestDate)}${spike && spike >= 2 ? ` · ${spike}× a normal day` : ""}`
                : "nothing filed yet",
              tone: spike !== null && spike >= 3 ? "danger" : "default",
            },
          ]}
        />
      </div>

      <div className="mb-6">
        <ChartCard
          title="Reports per day"
          hint={`${formatNumber(data.totalInWindow)} over ${data.days} days`}
        >
          {data.totalInWindow === 0 ? (
            <EmptyState title="No reports filed in this window" />
          ) : (
            <SeriesChart
              series={[
                {
                  key: "reports",
                  label: "Reports",
                  emphasis: "primary",
                  values: counts,
                  summary: `${formatNumber(data.totalInWindow)} total`,
                },
                {
                  key: "open",
                  label: "Still open",
                  emphasis: "secondary",
                  values: data.perDay.map((point) => point.openReports),
                  summary: `${formatNumber(data.openInWindow)} open`,
                },
              ]}
              axisLabels={data.perDay.map((point) => shortDate(point.date))}
              pointLabels={data.perDay.map((point) => shortDate(point.date))}
              formatValue={formatNumber}
              ariaLabel={`Abuse reports filed per day over the last ${data.days} days, ${formatNumber(data.totalInWindow)} in total, peaking at ${formatNumber(data.busiestCount)} in one day.`}
              height={170}
            />
          )}
        </ChartCard>
      </div>

      <SectionLabel hint="More than one report in this window">Repeat targets</SectionLabel>
      <div className="mb-6">
        <Card>
          {data.repeatTargets.length === 0 ? (
            <EmptyState
              title="Nobody has been reported twice"
              description="Every report in this window is about a different page."
            />
          ) : (
            <ul className="flex flex-col">
              {data.repeatTargets.map((target, index) => (
                <li
                  key={target.username}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 ${
                    index > 0 ? "border-hairline border-t" : ""
                  }`}
                >
                  <span className="text-ink min-w-0 flex-1 truncate text-[13px] font-medium">
                    {target.orgId && target.kyteId ? (
                      <Link
                        href={`/orgs/${target.orgId}/${target.kyteId}`}
                        className="hover:text-accent cursor-pointer"
                      >
                        @{target.username}
                      </Link>
                    ) : (
                      `@${target.username}`
                    )}
                    {target.ownerEmail ? (
                      <span className="text-tertiary font-normal"> · {target.ownerEmail}</span>
                    ) : null}
                  </span>
                  {target.moderationStatus ? (
                    <ModerationStatusPill status={target.moderationStatus} />
                  ) : null}
                  <span className="text-secondary shrink-0 text-[12px] tabular-nums">
                    {formatNumber(target.reports)} reports
                    <span className="text-faint">
                      {" · "}
                      {formatNumber(target.reporters)}{" "}
                      {target.reporters === 1 ? "reporter" : "reporters"}
                      {" · last "}
                      {formatRelativeTime(target.lastReportedAt)}
                    </span>
                  </span>
                  {target.openReports > 0 ? (
                    <span className="bg-warning-soft text-warning rounded-pill shrink-0 px-2 py-0.5 text-[12px] font-medium tabular-nums">
                      {formatNumber(target.openReports)} open
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="By reason" hint="what people picked">
          {data.byReason.length === 0 ? (
            <EmptyState title="Nothing filed yet" />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.byReason.map((row) => (
                <BarRow
                  key={row.reason}
                  label={ABUSE_REASON_LABELS[row.reason]}
                  hint={row.openReports > 0 ? `${formatNumber(row.openReports)} open` : undefined}
                  value={row.reports}
                  max={reasonMax}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Owner email domains" hint="of the reported page">
          {data.ownerDomains.length === 0 ? (
            <EmptyState title="No reported page has an owner on file" />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.ownerDomains.map((row) => (
                <BarRow
                  key={row.domain}
                  label={row.domain}
                  hint={`${formatNumber(row.accounts)} ${row.accounts === 1 ? "account" : "accounts"}${
                    row.suspendedAccounts > 0 ? `, ${formatNumber(row.suspendedAccounts)} locked` : ""
                  }`}
                  value={row.reports}
                  max={domainMax}
                  tone={row.suspendedAccounts > 0 ? "warning" : "accent"}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Busiest reporters" hint="grouped by IP hash">
          {data.reporters.length === 0 ? (
            <EmptyState title="Nobody filed more than one report" />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.reporters.map((row) => (
                <BarRow
                  key={row.fingerprint}
                  label={<span className="font-mono text-[12px]">{row.fingerprint}…</span>}
                  hint={`${formatNumber(row.targets)} ${row.targets === 1 ? "target" : "targets"}${
                    row.dismissed > 0 ? `, ${formatNumber(row.dismissed)} dismissed` : ""
                  }`}
                  value={row.reports}
                  max={reporterMax}
                  tone={row.dismissed > 0 ? "warning" : "accent"}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
