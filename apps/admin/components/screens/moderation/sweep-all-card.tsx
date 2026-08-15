import { useCallback, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { StatusPill, type StatusPillProps } from "../../ui/status-pill";
import { ChevronDownGlyph } from "../../shell/icons";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { usePolling } from "../../../hooks/use-polling";
import { formatNumber, formatRelativeTime } from "../../../lib/format";
import type { SweepProgress } from "../../../lib/admin-source";
import { plural } from "./moderation-copy";

const POLL_MS = 2000;
// Idle polling is what lets a sweep started in another admin's tab (or by the
// scheduled job) light this card up. Pausing outright instead would latch the
// card off: `live` can only turn on from a response it is no longer fetching.
const IDLE_POLL_MS = 10_000;

export interface SweepAllCardProps {
  onFinished?: () => void;
}

type SweepActivity = SweepProgress["recent"][number];
type SweepState = SweepProgress["state"];

const RESTART_NOTE = "Restarting re-reviews every kyte from the top.";

function sweepMeter(progress: SweepProgress): number {
  if (progress.total <= 0) return 0;
  return Math.min(100, Math.round((progress.processed / progress.total) * 100));
}

/** Kytes per minute over the whole run — the sweep's throughput is flat enough
 * that a windowed rate would only add jitter to a number read once a second. */
function ratePerMinute(progress: SweepProgress, now: number): number | null {
  const elapsedMs = now - new Date(progress.startedAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 1000 || progress.processed <= 0)
    return null;
  return (progress.processed / elapsedMs) * 60_000;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function etaLabel(progress: SweepProgress, rate: number | null): string | null {
  if (rate === null || rate <= 0) return null;
  const remaining = progress.total - progress.processed;
  if (remaining <= 0) return null;
  return `${formatDuration(remaining / rate)} left`;
}

function elapsedLabel(progress: SweepProgress): string | null {
  if (!progress.finishedAt) return null;
  const ms =
    new Date(progress.finishedAt).getTime() - new Date(progress.startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  return formatDuration(ms / 60_000);
}

function counts(progress: SweepProgress): string {
  const parts = [
    `${formatNumber(progress.suspended)} suspended`,
    `${formatNumber(progress.approved)} approved`,
  ];
  if (progress.skipped > 0) parts.push(`${formatNumber(progress.skipped)} skipped`);
  if (progress.failed > 0) parts.push(`${formatNumber(progress.failed)} errored`);
  return parts.join(" · ");
}

function activityPill(activity: SweepActivity): StatusPillProps {
  if (activity.verdict === "FAILED") return { label: "Errored", tone: "danger" };
  if (activity.verdict === "SKIPPED") return { label: "Skipped", tone: "neutral" };
  if (activity.verdict === "SUSPEND") {
    return { label: activity.changed ? "Suspended" : "Still suspended", tone: "warning" };
  }
  return activity.changed
    ? { label: "Restored", tone: "success" }
    : { label: "Approved", tone: "neutral" };
}

function ActivityFeed({ recent }: { recent: SweepActivity[] }) {
  if (recent.length === 0) return null;
  return (
    <ul className="border-hairline flex flex-col border-t">
      {recent.map((activity) => {
        const pill = activityPill(activity);
        return (
          <li
            key={`${activity.kyteId}-${activity.at}`}
            className="border-hairline flex items-center gap-3 border-b py-2 last:border-b-0"
          >
            <span className="w-32 shrink-0">
              <StatusPill label={pill.label} tone={pill.tone} />
            </span>
            <span className="text-ink w-32 shrink-0 truncate text-[12px] font-medium">
              {activity.username ? `@${activity.username}` : "untitled kyte"}
            </span>
            <span className="text-tertiary min-w-0 flex-1 truncate text-[12px]">
              {activity.reason}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function SweepAllCard({ onFinished }: SweepAllCardProps) {
  const source = useAdminSource();
  const { toast } = useToast();
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [starting, setStarting] = useState(false);

  // The run that just ended is what the suspended list below needs to refetch
  // for, and "is a sweep in flight" is decided from the response itself — a
  // sweep started in another admin's tab has to switch this card on too.
  // `state` is the authority, not `finishedAt`: an interrupted run has no
  // finish stamp but is not running either, and polling it as if it were is
  // exactly what left the card stuck with a disabled button.
  const wasRunning = useRef(false);
  const fetchStatus = useCallback(async () => {
    const result = await source.sweepStatus();
    const isRunning = result.progress?.state === "running";
    setLive(isRunning);
    if (wasRunning.current && !isRunning) onFinished?.();
    wasRunning.current = isRunning;
    return result;
  }, [source, onFinished]);

  const { data, status, lastUpdatedAt, refresh } = usePolling(
    fetchStatus,
    live ? POLL_MS : IDLE_POLL_MS,
  );

  const progress = data?.progress ?? null;
  const publishedKytes = data?.publishedKytes ?? 0;
  const state: SweepState | null = progress?.state ?? null;
  const running = state === "running";
  // Measured against the moment the counters were fetched, not render time —
  // pure, and the honest denominator for the numbers actually on screen.
  const rate =
    progress && running && lastUpdatedAt ? ratePerMinute(progress, lastUpdatedAt) : null;
  const eta = progress && running ? etaLabel(progress, rate) : null;

  async function start() {
    setStarting(true);
    try {
      const result = await source.sweepAllKytes();
      setConfirming(false);
      setLive(true);
      refresh();
      toast(
        result.started
          ? `Reviewing ${formatNumber(result.progress.total)} published ${plural(result.progress.total, "kyte")}.`
          : "A review is already running — showing its progress.",
      );
    } catch {
      toast("Couldn't start the review. Try again.", { tone: "danger" });
    } finally {
      setStarting(false);
    }
  }

  async function cancel() {
    setCancelBusy(true);
    try {
      const result = await source.cancelSweep();
      setCancelling(false);
      refresh();
      toast(
        result.progress?.state === "cancelled"
          ? `Stopped after ${formatNumber(result.progress.processed)} ${plural(result.progress.processed, "kyte")}.`
          : "Stopping — reviews already under way will finish.",
      );
    } catch {
      toast("Couldn't cancel the review. Try again.", { tone: "danger" });
    } finally {
      setCancelBusy(false);
    }
  }

  // Running forces the card open — that's the one time watching it matters.
  // Otherwise it stays a single summary row until the admin asks for it.
  const expanded = open || running;

  return (
    <>
      <div className="rounded-card border-cardline bg-card border">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={() => {
              // A run pins the card open, so toggling then would silently arm a
              // state the admin never sees — ignore clicks until it finishes.
              if (!running) setOpen((value) => !value);
            }}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          >
            <ChevronDownGlyph
              className={`text-tertiary h-3.5 w-3.5 shrink-0 ${expanded ? "" : "-rotate-90"}`}
            />
            <h2 className="text-ink shrink-0 text-[13px] font-semibold">
              Re-review every kyte
            </h2>
            {expanded ? null : (
              <span className="text-tertiary min-w-0 truncate text-[12px] [font-variant-numeric:tabular-nums]">
                {summaryLine(progress, running, publishedKytes)}
              </span>
            )}
          </button>
          <div className="flex shrink-0 items-center gap-2">
            {running ? (
              <Button size="sm" tone="danger" onClick={() => setCancelling(true)}>
                Cancel
              </Button>
            ) : null}
            <Button
              size="sm"
              tone="primary"
              onClick={() => setConfirming(true)}
              disabled={running || status === "loading"}
            >
              Review all kytes
            </Button>
          </div>
        </div>

        {expanded ? (
          <div className="border-hairline flex flex-col gap-3 border-t px-4 py-3">
            <p className="text-tertiary text-[12px] leading-relaxed">
              Sends every published kyte back through the moderation pipeline. Imported
              pages never passed through it, so nothing has ever checked them.
            </p>
            <SweepBody
              progress={progress}
              state={state}
              running={running}
              rate={rate}
              eta={eta}
              publishedKytes={publishedKytes}
            />
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Review all kytes"
        description="Every published kyte goes back through the deterministic checks and the AI provider, and anything that trips them is suspended immediately. It runs in the background — you can leave this page."
        confirmLabel="Start review"
        tone="warning"
        details={[
          { label: "Kytes sent to the provider", value: formatNumber(publishedKytes) },
          { label: "Suspensions", value: "Applied automatically" },
        ]}
        busy={starting}
        onConfirm={() => void start()}
        onCancel={() => setConfirming(false)}
      />

      <ConfirmDialog
        open={cancelling}
        title="Cancel this review"
        description="The sweep stops picking up new kytes. Reviews already under way finish first, and every verdict recorded so far keeps its suspension or approval — cancelling undoes nothing."
        confirmLabel="Stop review"
        tone="danger"
        details={
          progress
            ? [
                {
                  label: "Reviewed so far",
                  value: `${formatNumber(progress.processed)} / ${formatNumber(progress.total)}`,
                },
                { label: "Suspended so far", value: formatNumber(progress.suspended) },
              ]
            : undefined
        }
        busy={cancelBusy}
        onConfirm={() => void cancel()}
        onCancel={() => setCancelling(false)}
      />
    </>
  );
}

function SweepBody({
  progress,
  state,
  running,
  rate,
  eta,
  publishedKytes,
}: {
  progress: SweepProgress | null;
  state: SweepState | null;
  running: boolean;
  rate: number | null;
  eta: string | null;
  publishedKytes: number;
}) {
  return running && progress ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Kytes reviewed"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.processed}
          className="rounded-pill bg-tint-hover h-1.5 w-full overflow-hidden"
        >
          <div
            className="rounded-pill bg-accent h-full"
            style={{ width: `${sweepMeter(progress)}%` }}
          />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[12px] [font-variant-numeric:tabular-nums]">
          <p className="text-secondary">
            {formatNumber(progress.processed)} / {formatNumber(progress.total)} reviewed —{" "}
            {counts(progress)}
          </p>
          <p className="text-tertiary">
            {rate === null ? "starting…" : `${formatNumber(Math.round(rate))}/min`}
            {eta ? ` · ${eta}` : ""}
          </p>
        </div>
      </div>
      <ActivityFeed recent={progress.recent} />
    </div>
  ) : progress && state === "interrupted" ? (
    <div className="flex flex-col gap-3">
      <p className="rounded-input border-warning-border bg-warning-soft text-warning border px-3 py-2 text-[12px] [font-variant-numeric:tabular-nums]">
        This review was interrupted (deploy or crash) after{" "}
        {formatNumber(progress.processed)} of {formatNumber(progress.total)} kytes —
        restart to re-run it. {RESTART_NOTE}
      </p>
      <ActivityFeed recent={progress.recent} />
    </div>
  ) : progress && state === "cancelled" ? (
    <div className="flex flex-col gap-3">
      <p className="text-tertiary text-[12px] [font-variant-numeric:tabular-nums]">
        Cancelled by {progress.cancelledBy ?? progress.requestedBy}{" "}
        {formatRelativeTime(progress.finishedAt ?? progress.startedAt)} after{" "}
        {formatNumber(progress.processed)} of {formatNumber(progress.total)} kytes —{" "}
        {counts(progress)}. Those verdicts stand. {RESTART_NOTE}
      </p>
      <ActivityFeed recent={progress.recent} />
    </div>
  ) : progress ? (
    <div className="flex flex-col gap-3">
      <p className="text-tertiary text-[12px] [font-variant-numeric:tabular-nums]">
        Last run {formatRelativeTime(progress.finishedAt ?? progress.startedAt)} by{" "}
        {progress.requestedBy} — {formatNumber(progress.reviewed)} reviewed,{" "}
        {counts(progress)}
        {elapsedLabel(progress) ? `, in ${elapsedLabel(progress)}` : ""}.
      </p>
      <ActivityFeed recent={progress.recent} />
    </div>
  ) : (
    <p className="text-tertiary text-[12px]">
      Never run here. {formatNumber(publishedKytes)} published{" "}
      {plural(publishedKytes, "kyte")} are live right now.
    </p>
  );
}

function summaryLine(
  progress: SweepProgress | null,
  running: boolean,
  publishedKytes: number,
): string {
  if (running && progress) {
    return `${formatNumber(progress.processed)} / ${formatNumber(progress.total)} — ${counts(progress)}`;
  }
  if (progress?.state === "interrupted") {
    return `Interrupted after ${formatNumber(progress.processed)} of ${formatNumber(progress.total)}`;
  }
  if (progress?.state === "cancelled") {
    return `Cancelled after ${formatNumber(progress.processed)} of ${formatNumber(progress.total)}`;
  }
  if (progress) {
    return `Last run ${formatRelativeTime(progress.finishedAt ?? progress.startedAt)} — ${counts(progress)}`;
  }
  return `Never run · ${formatNumber(publishedKytes)} published ${plural(publishedKytes, "kyte")} live`;
}
