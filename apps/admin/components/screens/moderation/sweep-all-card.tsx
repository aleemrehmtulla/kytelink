import { useCallback, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { Section } from "../../ui/section";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { usePolling } from "../../../hooks/use-polling";
import { formatNumber, formatRelativeTime } from "../../../lib/format";
import type { SweepProgress } from "../../../lib/admin-source";
import { plural } from "./moderation-copy";

const POLL_MS = 3000;

export interface SweepAllCardProps {
  onFinished?: () => void;
}

function sweepMeter(progress: SweepProgress): number {
  if (progress.total <= 0) return 0;
  return Math.min(100, Math.round((progress.processed / progress.total) * 100));
}

function tally(progress: SweepProgress): string {
  const parts = [
    `${formatNumber(progress.suspended)} suspended`,
    `${formatNumber(progress.approved)} approved`,
  ];
  if (progress.skipped > 0) parts.push(`${formatNumber(progress.skipped)} skipped`);
  if (progress.failed > 0) parts.push(`${formatNumber(progress.failed)} errored`);
  return parts.join(" · ");
}

export function SweepAllCard({ onFinished }: SweepAllCardProps) {
  const source = useAdminSource();
  const { toast } = useToast();
  const [live, setLive] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);

  // Polling is only worth its cost while a sweep is in flight, and the run that
  // just ended is what the suspended list below needs to refetch for. Both are
  // decided from the response itself — a sweep started in another admin's tab
  // has to switch this card on too.
  const wasRunning = useRef(false);
  const fetchStatus = useCallback(async () => {
    const result = await source.sweepStatus();
    const isRunning = result.progress !== null && result.progress.finishedAt === null;
    setLive(isRunning);
    if (wasRunning.current && !isRunning) onFinished?.();
    wasRunning.current = isRunning;
    return result;
  }, [source, onFinished]);

  const { data, status, refresh } = usePolling(fetchStatus, POLL_MS, { paused: !live });

  const progress = data?.progress ?? null;
  const publishedKytes = data?.publishedKytes ?? 0;
  const running = progress !== null && progress.finishedAt === null;

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

  return (
    <>
      <Section
        title="Re-review every kyte"
        description="Sends every published kyte back through the moderation pipeline. Imported pages never passed through it, so nothing has ever checked them."
        action={
          <Button
            tone="primary"
            onClick={() => setConfirming(true)}
            disabled={running || status === "loading"}
          >
            Review all kytes
          </Button>
        }
      >
        {running && progress ? (
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
            <p className="text-secondary text-[12px] [font-variant-numeric:tabular-nums]">
              {formatNumber(progress.processed)} / {formatNumber(progress.total)} reviewed —{" "}
              {tally(progress)}
            </p>
          </div>
        ) : progress ? (
          <p className="text-tertiary text-[12px] [font-variant-numeric:tabular-nums]">
            Last run {formatRelativeTime(progress.finishedAt ?? progress.startedAt)} by{" "}
            {progress.requestedBy} — {formatNumber(progress.reviewed)} reviewed, {tally(progress)}.
          </p>
        ) : (
          <p className="text-tertiary text-[12px]">
            Never run here. {formatNumber(publishedKytes)} published{" "}
            {plural(publishedKytes, "kyte")} are live right now.
          </p>
        )}
      </Section>

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
    </>
  );
}
