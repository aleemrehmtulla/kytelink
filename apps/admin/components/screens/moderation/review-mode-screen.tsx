import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProfileView } from "@kytelink/ui/profile-view";
import { Button, ButtonLink } from "../../ui/button";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { StatusPill } from "../../ui/status-pill";
import { useToast } from "../../ui/toast";
import { CheckGlyph, EyeGlyph, RestoreGlyph, XGlyph } from "../../shell/icons";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { INPUT_CLASSES } from "../../ui/confirm-dialog";
import { formatDateTimeFull, formatRelativeTime } from "../../../lib/format";
import type { KytePublishedSnapshot, SuspendedRow } from "../../../lib/admin-source";
import { LinkDestinations, SignalPills } from "./evidence";
import { SUSPENSION_SOURCE_LABELS, plural } from "./moderation-copy";
import { ReviewMeta } from "./review-detail";
import { kytePreviewHref } from "./view-page-link";

const DECK_SIZE = 50;
const DEFAULT_RESTORE_REASON = "Wrongly suspended — cleared in review mode";
const RESUSPEND_REASON = "Reinstating suspension — review-mode undo";

// Matches ProfileView's own CONTENT_MAX_WIDTH, same as the preview page.
const PROFILE_WIDTH = 420;

type Decision = "restored" | "kept";

type SnapshotState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; snapshot: KytePublishedSnapshot };

export function ReviewModeScreen() {
  const source = useAdminSource();
  const { toast } = useToast();

  const fetchDeck = useCallback(
    () =>
      source.suspendedList({
        search: "",
        scope: "kyte",
        sort: "suspendedAt",
        dir: "desc",
        page: 1,
        pageSize: DECK_SIZE,
      }),
    [source],
  );
  const deck = useAsync(fetchDeck);
  const deckData = deck.data;
  const rows = useMemo(() => deckData?.rows ?? [], [deckData]);
  const total = deckData?.total ?? 0;

  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [reason, setReason] = useState(DEFAULT_RESTORE_REASON);
  const [busy, setBusy] = useState(false);
  const [snapshots, setSnapshots] = useState<Record<string, SnapshotState>>({});
  const requested = useRef<Set<string>>(new Set());

  const row: SuspendedRow | undefined = rows[index];
  const done = deck.status === "success" && rows.length > 0 && index >= rows.length;
  const decision = row ? decisions[row.kyteId] : undefined;
  const trimmedReason = reason.trim();
  const reasonOk = trimmedReason.length >= 3;

  const loadSnapshot = useCallback(
    (kyteId: string) => {
      if (requested.current.has(kyteId)) return;
      requested.current.add(kyteId);
      setSnapshots((prev) => ({ ...prev, [kyteId]: { status: "loading" } }));
      source
        .kytePublishedSnapshot(kyteId)
        .then((snapshot) => {
          setSnapshots((prev) => ({
            ...prev,
            [kyteId]: snapshot ? { status: "ready", snapshot } : { status: "missing" },
          }));
        })
        .catch(() => {
          setSnapshots((prev) => ({ ...prev, [kyteId]: { status: "error" } }));
        });
    },
    [source],
  );

  // Current card plus the one behind it, so advancing never shows a spinner.
  useEffect(() => {
    const current = rows[index];
    if (current) loadSnapshot(current.kyteId);
    const next = rows[index + 1];
    if (next) loadSnapshot(next.kyteId);
  }, [rows, index, loadSnapshot]);

  // Warm the next card's images too — a prefetched snapshot that still paints
  // a popping avatar reads as jank when flipping through the deck.
  useEffect(() => {
    const next = rows[index + 1];
    if (!next) return;
    const state = snapshots[next.kyteId];
    if (!state || state.status !== "ready") return;
    const sources: string[] = [];
    const avatar = state.snapshot.content.avatar;
    if (avatar) {
      sources.push(avatar.url);
      if (avatar.lqip) sources.push(avatar.lqip);
    }
    for (const link of state.snapshot.content.links) {
      if (link.emoji?.includes("://")) sources.push(link.emoji);
    }
    for (const src of sources) new Image().src = src;
  }, [rows, index, snapshots]);

  // Advancing also resets the reason: a card-specific justification must never
  // bleed into the next card's audit entry.
  const advance = useCallback(() => {
    setIndex((value) => value + 1);
    setReason(DEFAULT_RESTORE_REASON);
  }, []);

  const retrySnapshot = useCallback(
    (kyteId: string) => {
      requested.current.delete(kyteId);
      setSnapshots((prev) => {
        const next = { ...prev };
        delete next[kyteId];
        return next;
      });
      loadSnapshot(kyteId);
    },
    [loadSnapshot],
  );

  const keep = useCallback(() => {
    if (!row || busy) return;
    setDecisions((prev) => ({ ...prev, [row.kyteId]: prev[row.kyteId] ?? "kept" }));
    advance();
  }, [row, busy, advance]);

  const restore = useCallback(async () => {
    if (!row || busy || !reasonOk || decision === "restored") return;
    setBusy(true);
    try {
      await source.unsuspendKyte({ kyteId: row.kyteId, reason: trimmedReason });
      setDecisions((prev) => ({ ...prev, [row.kyteId]: "restored" }));
      toast(`${row.username ? `@${row.username}` : "Kyte"} restored — live again.`, {
        tone: "success",
      });
      advance();
    } catch {
      toast("Couldn't restore that kyte. Nothing changed.", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }, [row, busy, reasonOk, decision, source, trimmedReason, toast, advance]);

  const resuspend = useCallback(async () => {
    if (!row || busy) return;
    setBusy(true);
    try {
      await source.suspendKyte({ kyteId: row.kyteId, reason: RESUSPEND_REASON });
      setDecisions((prev) => ({ ...prev, [row.kyteId]: "kept" }));
      toast(`${row.username ? `@${row.username}` : "Kyte"} suspended again.`, {
        tone: "success",
      });
    } catch {
      toast("Couldn't re-suspend that kyte. It is still live.", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }, [row, busy, source, toast]);

  const goBack = useCallback(() => {
    if (busy) return;
    setIndex((value) => Math.max(0, value - 1));
  }, [busy]);

  // Arrow keys drive the deck. Modified chords (Cmd/Alt+Arrow is browser
  // back/forward) and key auto-repeat must never reach the mutations, and
  // typing in the reason field is never a deck gesture.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        keep();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void restore();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        goBack();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keep, restore, goBack]);

  const restoredCount = Object.values(decisions).filter(
    (value) => value === "restored",
  ).length;
  const keptCount = Object.values(decisions).filter((value) => value === "kept").length;

  const position = Math.min(index + 1, rows.length);
  const header = (
    <PageHeader
      breadcrumbs={[
        { label: "Moderation", href: "/moderation" },
        { label: "Review mode" },
      ]}
      title="Review mode"
      description="Newest suspensions first, rendered as published — restore the wrongful ones, keep the rest."
      action={
        <>
          {rows.length > 0 && !done ? (
            <span className="rounded-pill bg-tint text-secondary inline-flex items-center gap-2 px-3 py-1 text-[12px] font-medium [font-variant-numeric:tabular-nums]">
              <span
                aria-hidden="true"
                className="bg-tint-hover rounded-pill relative h-1.5 w-16 overflow-hidden"
              >
                <span
                  className="bg-accent absolute inset-y-0 left-0"
                  style={{ width: `${Math.round((position / rows.length) * 100)}%` }}
                />
              </span>
              {position} of {rows.length}
              {total > rows.length ? ` · ${total} suspended` : ""}
            </span>
          ) : null}
          <ButtonLink href="/moderation">Back to queue</ButtonLink>
        </>
      }
    />
  );

  // Gate on status alone: after a deck reload the old rows are still in
  // memory, and rendering them would let the admin act on a stale card.
  if (deck.status === "loading") {
    return (
      <>
        {header}
        <LoadingState rows={8} />
      </>
    );
  }

  if (deck.status === "error") {
    return (
      <>
        {header}
        <ErrorState message="Couldn't load the suspended queue." onRetry={deck.reload} />
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="Nothing to review."
          description="No kytes are individually suspended right now. Pages down with their org are handled from the org, not here."
          action={<ButtonLink href="/moderation">Back to queue</ButtonLink>}
          framed
        />
      </>
    );
  }

  if (done || !row) {
    return (
      <>
        {header}
        <EmptyState
          title="Deck clear."
          description={`You went through ${rows.length} ${plural(rows.length, "suspension")} — ${restoredCount} restored, ${keptCount} kept down.`}
          action={
            <div className="flex items-center gap-2">
              <Button
                icon={<RestoreGlyph className="h-3.5 w-3.5" />}
                onClick={() => {
                  setIndex(0);
                  setDecisions({});
                  setSnapshots({});
                  requested.current.clear();
                  setReason(DEFAULT_RESTORE_REASON);
                  deck.reload();
                }}
              >
                Load a fresh deck
              </Button>
              <ButtonLink tone="primary" href="/moderation">
                Back to queue
              </ButtonLink>
            </div>
          }
          framed
        />
      </>
    );
  }

  const snapshot = snapshots[row.kyteId] ?? { status: "loading" };

  return (
    <>
      {header}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:grow">
          <div
            className="rounded-card border-cardline mx-auto overflow-hidden border"
            style={{ maxWidth: PROFILE_WIDTH }}
          >
            {/* Fixed height, not max-height: the frame must not resize between
                cards, or every advance shifts the whole page. */}
            <div className="h-[max(420px,calc(100dvh-320px))] overflow-y-auto">
              {snapshot.status === "ready" ? (
                <ProfileView
                  content={snapshot.snapshot.content}
                  username={snapshot.snapshot.username ?? undefined}
                  isPreview
                />
              ) : snapshot.status === "loading" ? (
                <div className="p-6">
                  <LoadingState rows={6} />
                </div>
              ) : snapshot.status === "error" ? (
                <div className="p-6">
                  <ErrorState
                    message="Couldn't load this page's published content."
                    onRetry={() => retrySnapshot(row.kyteId)}
                  />
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState
                    title="No published snapshot."
                    description="This kyte was suspended without ever shipping a published page — judge it from its evidence."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 lg:w-[380px]">
          <div className="rounded-card border-cardline bg-card flex flex-col gap-3 border p-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span className="text-ink max-w-full truncate text-[15px] font-semibold">
                {row.username ? `@${row.username}` : "Kyte without a username"}
              </span>
              {row.displayName ? (
                <span className="text-tertiary truncate text-[13px]">
                  {row.displayName}
                </span>
              ) : null}
              {decision === "restored" ? (
                <StatusPill label="Restored" tone="success" />
              ) : (
                <StatusPill label="Suspended" tone="warning" />
              )}
            </div>
            {decision === "restored" ? (
              <>
                <p className="text-secondary text-[13px]">
                  Restored this session — the page is live again.
                </p>
                <div className="flex items-center gap-2">
                  <Button tone="warning" onClick={() => void resuspend()} busy={busy}>
                    Suspend again
                  </Button>
                  <Button tone="primary" onClick={advance} disabled={busy}>
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-tertiary text-[12px] font-medium">
                    Restore reason (recorded in the audit log)
                  </span>
                  <input
                    type="text"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={500}
                    className={INPUT_CLASSES}
                  />
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    full
                    tone="primary"
                    icon={<XGlyph className="h-3.5 w-3.5" />}
                    onClick={keep}
                    disabled={busy}
                  >
                    Keep suspended
                  </Button>
                  <Button
                    tone="success"
                    icon={<CheckGlyph className="h-3.5 w-3.5" />}
                    onClick={() => void restore()}
                    busy={busy}
                    disabled={!reasonOk}
                  >
                    Restore
                  </Button>
                </div>
                <p className="text-faint text-center text-[11px]">
                  ← keep suspended · restore → · ⌫ steps back
                </p>
              </>
            )}
          </div>

          <div className="rounded-card border-cardline bg-card flex flex-col gap-2.5 border p-4">
            <div className="text-tertiary flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span className="text-secondary min-w-0 truncate">{row.email}</span>
              <span aria-hidden="true">·</span>
              <span title={formatDateTimeFull(row.suspendedAt)}>
                suspended {formatRelativeTime(row.suspendedAt)}
              </span>
              <span className="rounded-pill bg-tint text-secondary px-2 py-0.5 font-medium">
                {SUSPENSION_SOURCE_LABELS[row.source]}
              </span>
              {row.reportCount > 0 ? (
                <span className="rounded-pill bg-warning-soft text-warning px-2 py-0.5 font-medium tabular-nums">
                  {row.reportCount} {plural(row.reportCount, "report")}
                </span>
              ) : null}
            </div>

            <div className="rounded-input border-warning-border bg-warning-soft/60 flex flex-col gap-0.5 border px-3 py-2">
              <span className="text-warning text-[11px] font-medium tracking-[0.06em] uppercase">
                Why it went down
              </span>
              <p className="text-secondary text-[13px] leading-relaxed break-words">
                {row.reasonOrNote}
              </p>
            </div>

            <ReviewMeta
              verdict={row.verdict}
              provider={row.provider}
              confidence={row.confidence}
              reviewedBy={row.reviewedBy}
              reviewedAt={row.reviewedAt}
              source={row.source}
            />

            <SignalPills signals={row.signals} />

            {snapshot.status === "ready" ? (
              <div className="border-hairline flex flex-col gap-1.5 border-t pt-2.5">
                <span className="text-tertiary text-[11px] tracking-[0.06em] uppercase">
                  Link destinations
                </span>
                <LinkDestinations content={snapshot.snapshot.content} />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <ButtonLink
                size="sm"
                href={kytePreviewHref(row.kyteId)}
                icon={<EyeGlyph className="h-3.5 w-3.5" />}
              >
                Full preview
              </ButtonLink>
              <ButtonLink size="sm" href={`/orgs/${row.orgId}/${row.kyteId}`}>
                Open kyte
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
