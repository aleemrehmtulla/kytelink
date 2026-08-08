import { CapabilityStrip } from "../../ui/capability-strip";
import { EmptyState } from "../../ui/empty-state";
import { formatNumber } from "../../../lib/format";
import type { OverviewStats } from "../../../lib/admin-source";

export interface PlatformHealthSectionProps {
  stats: OverviewStats;
}

export function PlatformHealthSection({ stats }: PlatformHealthSectionProps) {
  const queues = stats.queueDepths;
  const backlog = queues.reduce((acc, queue) => acc + queue.depth, 0);
  const deadLettered = queues.reduce((acc, queue) => acc + queue.deadLettered, 0);

  return (
    <details className="rounded-card border-cardline bg-card border">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 p-5 [&::-webkit-details-marker]:hidden">
        <span className="text-ink text-[13px] font-semibold">Platform health</span>
        <span className="text-tertiary text-[12px] tabular-nums">
          {stats.beaconIngestLagMs} ms beacon lag ·{" "}
          {queues.length === 0
            ? "no queues reporting"
            : `${formatNumber(backlog)} queued, ${formatNumber(deadLettered)} dead-lettered`}
        </span>
      </summary>

      <div className="border-hairline border-t p-5">
        <p className="text-secondary mb-4 text-[13px] leading-relaxed">
          Operator data for whoever runs this deployment. Beacon lag is how far behind the
          analytics ingest is; a growing queue depth or any dead-lettered job means
          background work is failing.
        </p>

        {queues.length === 0 ? (
          <EmptyState
            title="No queues reporting"
            description="This deployment has no background queues publishing depth metrics right now."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">
                Background queue depth and dead-lettered jobs
              </caption>
              <thead>
                <tr className="border-hairline text-tertiary border-b text-[11px] tracking-wide uppercase">
                  <th className="pb-2.5 font-medium">Queue</th>
                  <th className="pb-2.5 text-right font-medium">Depth</th>
                  <th className="pb-2.5 text-right font-medium">Dead-lettered</th>
                </tr>
              </thead>
              <tbody>
                {queues.map((queue) => (
                  <tr
                    key={queue.queue}
                    className="border-hairline hover:bg-tint border-t"
                  >
                    <td className="text-ink py-2.5">{queue.queue}</td>
                    <td className="text-secondary py-2.5 text-right tabular-nums">
                      {formatNumber(queue.depth)}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums ${
                        queue.deadLettered > 0 ? "text-danger" : "text-secondary"
                      }`}
                    >
                      {formatNumber(queue.deadLettered)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-hairline mt-5 border-t pt-5">
          <p className="text-tertiary mb-2.5 text-[12px] font-medium">
            Enabled capabilities
          </p>
          <CapabilityStrip capabilities={stats.capabilities} />
        </div>
      </div>
    </details>
  );
}
