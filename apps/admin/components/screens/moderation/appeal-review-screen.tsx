import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProfileView } from "@kytelink/ui/profile-view";
import { Button, ButtonLink } from "../../ui/button";
import { ConfirmDialog, INPUT_CLASSES } from "../../ui/confirm-dialog";
import { copyText } from "../../ui/clipboard";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { StatusPill } from "../../ui/status-pill";
import { useToast } from "../../ui/toast";
import { CheckGlyph, EyeGlyph, XGlyph } from "../../shell/icons";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { formatDateTimeFull, formatRelativeTime } from "../../../lib/format";
import type { AppealRow, KytePublishedSnapshot } from "../../../lib/admin-source";
import { APPEAL_KIND_LABELS, plural } from "./moderation-copy";
import { kytePreviewHref } from "./view-page-link";

const DECK_SIZE = 50;
const PROFILE_WIDTH = 420;

type Decision = "accepted" | "denied";
type PendingConfirm = "accept" | "deny";

type SnapshotState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; snapshot: KytePublishedSnapshot };

function targetHref(row: AppealRow): string | null {
  if (row.kyteId && row.orgId) return `/orgs/${row.orgId}/${row.kyteId}`;
  if (row.orgId) return `/orgs/${row.orgId}`;
  if (row.userId) return `/users/${row.userId}`;
  return null;
}

/** What accepting will actually restore — or null when there's nothing to lift. */
function restoreTargetOf(row: AppealRow): "kyte" | "org" | "user" | null {
  if (!row.suspended) return null;
  if (row.kind === "kyte" && row.kyteId) return "kyte";
  if (row.kind === "org" && row.orgId) return "org";
  if (row.kind === "user" && row.userId) return "user";
  return null;
}

export function AppealReviewScreen() {
  const source = useAdminSource();
  const { toast } = useToast();

  // Oldest first: the person who has been waiting longest is heard first.
  const fetchDeck = useCallback(
    () =>
      source.appeals({
        search: "",
        status: "OPEN",
        dir: "asc",
        page: 1,
        pageSize: DECK_SIZE,
      }),
    [source],
  );
  const deck = useAsync(fetchDeck);
  const rows = useMemo(() => deck.data?.rows ?? [], [deck.data]);
  const total = deck.data?.total ?? 0;

  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<PendingConfirm | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, SnapshotState>>({});
  const requested = useRef<Set<string>>(new Set());

  const row: AppealRow | undefined = rows[index];
  const done = deck.status === "success" && rows.length > 0 && index >= rows.length;
  const decision = row ? decisions[row.id] : undefined;
  const trimmedNote = note.trim();
  const restoreTarget = row ? restoreTargetOf(row) : null;

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

  useEffect(() => {
    const current = rows[index];
    if (current?.kyteId) loadSnapshot(current.kyteId);
    const next = rows[index + 1];
    if (next?.kyteId) loadSnapshot(next.kyteId);
  }, [rows, index, loadSnapshot]);

  const advance = useCallback(() => {
    setIndex((value) => value + 1);
    setNote("");
  }, []);

  const goBack = useCallback(() => {
    if (busy) return;
    setIndex((value) => Math.max(0, value - 1));
  }, [busy]);

  const resolve = useCallback(
    async (status: "RESOLVED" | "DISMISSED") => {
      if (!row || busy || decision) return;
      setBusy(true);
      try {
        if (status === "RESOLVED" && restoreTarget !== null) {
          const reason = trimmedNote
            ? `Appeal accepted — ${trimmedNote}`
            : "Appeal accepted — restored after human review.";
          if (restoreTarget === "kyte" && row.kyteId) {
            await source.unsuspendKyte({ kyteId: row.kyteId, reason });
          } else if (restoreTarget === "org" && row.orgId) {
            await source.unsuspendOrg({ orgId: row.orgId, reason });
          } else if (restoreTarget === "user" && row.userId) {
            await source.setUserStatus({ userId: row.userId, status: "ACTIVE", reason });
          }
        }
        await source.resolveAppeal({
          appealId: row.id,
          status,
          ...(trimmedNote ? { note: trimmedNote } : {}),
        });
        setDecisions((prev) => ({
          ...prev,
          [row.id]: status === "RESOLVED" ? "accepted" : "denied",
        }));
        setConfirming(null);
        toast(
          status === "RESOLVED"
            ? `Appeal accepted — ${row.email} is being emailed.`
            : `Appeal denied — ${row.email} is being emailed.`,
          { tone: "success" },
        );
        advance();
      } catch {
        toast("Couldn't close that appeal. Nothing changed.", { tone: "danger" });
      } finally {
        setBusy(false);
      }
    },
    [row, busy, decision, restoreTarget, trimmedNote, source, toast, advance],
  );

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
        if (row && !decision) setConfirming("deny");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (row && !decision) setConfirming("accept");
      } else if (event.key === "Backspace") {
        event.preventDefault();
        goBack();
      }
    }
    if (confirming !== null) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [row, decision, confirming, goBack]);

  async function copyEmail() {
    if (!row) return;
    const ok = await copyText(row.email);
    toast(ok ? "Email copied." : "Couldn't copy the email.", {
      tone: ok ? "success" : "danger",
    });
  }

  const acceptedCount = Object.values(decisions).filter((value) => value === "accepted").length;
  const deniedCount = Object.values(decisions).filter((value) => value === "denied").length;

  const position = Math.min(index + 1, rows.length);
  const header = (
    <PageHeader
      breadcrumbs={[
        { label: "Moderation", href: "/moderation" },
        { label: "Appeals", href: "/moderation/appeals" },
        { label: "Review" },
      ]}
      title="Appeal review"
      description="Oldest first — every decision emails the person who appealed."
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
              {total > rows.length ? ` · ${total} open` : ""}
            </span>
          ) : null}
          <ButtonLink href="/moderation/appeals">All appeals</ButtonLink>
        </>
      }
    />
  );

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
        <ErrorState message="Couldn't load open appeals." onRetry={deck.reload} />
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No open appeals."
          description="Everyone who asked has been answered."
          action={<ButtonLink href="/moderation/appeals">All appeals</ButtonLink>}
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
          description={`You went through ${rows.length} ${plural(rows.length, "appeal")} — ${acceptedCount} accepted, ${deniedCount} denied. Everyone was emailed.`}
          action={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setIndex(0);
                  setDecisions({});
                  setSnapshots({});
                  requested.current.clear();
                  setNote("");
                  deck.reload();
                }}
              >
                Load a fresh deck
              </Button>
              <ButtonLink tone="primary" href="/moderation/appeals">
                All appeals
              </ButtonLink>
            </div>
          }
          framed
        />
      </>
    );
  }

  const snapshot: SnapshotState = row.kyteId
    ? (snapshots[row.kyteId] ?? { status: "loading" })
    : { status: "missing" };
  const href = targetHref(row);

  return (
    <>
      {header}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:grow">
          <div
            className="rounded-card border-cardline mx-auto overflow-hidden border"
            style={{ maxWidth: PROFILE_WIDTH }}
          >
            {/* Fixed height, same as review mode: the frame never resizes
                between cards, so the decision buttons never move. */}
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
                  />
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState
                    title={
                      row.kind === "kyte"
                        ? "No published page to preview."
                        : `${APPEAL_KIND_LABELS[row.kind]} appeal.`
                    }
                    description={
                      row.kind === "kyte"
                        ? "Judge this one from the appeal itself and the links on the right."
                        : "There's no single page to render — open the target to see what's suspended."
                    }
                    action={
                      href ? (
                        <ButtonLink href={href}>
                          Open {APPEAL_KIND_LABELS[row.kind].toLowerCase()}
                        </ButtonLink>
                      ) : undefined
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 lg:w-[380px]">
          <div className="rounded-card border-cardline bg-card flex flex-col gap-3 border p-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-pill bg-tint text-secondary shrink-0 px-2.5 py-0.5 text-[12px] font-medium">
                {APPEAL_KIND_LABELS[row.kind]}
              </span>
              <span className="text-ink min-w-0 truncate text-[15px] font-semibold">
                {row.handle}
              </span>
              <span className="ml-auto shrink-0">
                {decision === "accepted" ? (
                  <StatusPill label="Accepted" tone="success" />
                ) : decision === "denied" ? (
                  <StatusPill label="Denied" tone="neutral" />
                ) : row.suspended ? (
                  <StatusPill label="Suspended" tone="warning" />
                ) : (
                  <StatusPill label="Not suspended" tone="neutral" />
                )}
              </span>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-tertiary text-[12px] font-medium">
                Note to them (optional — included in the decision email)
              </span>
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                placeholder="e.g. verified the links — sorry for the trouble"
                className={INPUT_CLASSES}
              />
            </label>

            <div className="flex items-center gap-2">
              <Button
                full
                tone="primary"
                icon={<XGlyph className="h-3.5 w-3.5" />}
                onClick={() => setConfirming("deny")}
                disabled={busy || decision !== undefined}
              >
                {decision === "denied" ? "Denied" : "Deny appeal"}
              </Button>
              <Button
                tone="success"
                icon={<CheckGlyph className="h-3.5 w-3.5" />}
                onClick={() => setConfirming("accept")}
                disabled={busy || decision !== undefined}
              >
                {restoreTarget !== null ? "Accept & restore" : "Accept"}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-faint text-[11px]">
                ← deny · accept → · ⌫ steps back · both email them
              </p>
              <Button size="sm" tone="ghost" onClick={advance} disabled={busy}>
                Skip for now
              </Button>
            </div>
          </div>

          <div className="rounded-card border-cardline bg-card flex flex-col gap-2.5 border p-4">
            <div className="text-tertiary flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <button
                type="button"
                onClick={() => void copyEmail()}
                title="Copy their email"
                className="rounded-input bg-tint text-secondary hover:bg-tint-hover hover:text-ink min-w-0 cursor-pointer truncate px-2 py-0.5 font-mono text-[12px]"
              >
                {row.email}
              </button>
              <a
                href={`mailto:${row.email}`}
                className="text-accent hover:text-accent-hover shrink-0 cursor-pointer font-medium"
              >
                Write to them ↗
              </a>
              <span className="grow" />
              <span title={formatDateTimeFull(row.createdAt)}>
                filed {formatRelativeTime(row.createdAt)}
              </span>
            </div>

            <div className="rounded-input border-hairline bg-tint flex flex-col gap-0.5 border px-3 py-2">
              <span className="text-tertiary text-[11px] font-medium tracking-[0.06em] uppercase">
                Their appeal
              </span>
              <p className="text-secondary max-h-48 overflow-y-auto text-[13px] leading-relaxed break-words">
                {row.message}
              </p>
            </div>

            {!row.suspended ? (
              <p className="text-tertiary text-[12px] leading-relaxed">
                The target isn&rsquo;t suspended any more — accepting just closes the
                appeal and emails them; there&rsquo;s nothing left to restore.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {row.kyteId ? (
                <ButtonLink
                  size="sm"
                  href={kytePreviewHref(row.kyteId)}
                  icon={<EyeGlyph className="h-3.5 w-3.5" />}
                >
                  Full preview
                </ButtonLink>
              ) : null}
              {href ? (
                <ButtonLink size="sm" href={href}>
                  Open {APPEAL_KIND_LABELS[row.kind].toLowerCase()}
                </ButtonLink>
              ) : null}
              {row.userId && href !== `/users/${row.userId}` ? (
                <ButtonLink size="sm" href={`/users/${row.userId}`}>
                  Open account
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirming === "accept"}
        title={restoreTarget !== null ? `Accept and restore ${row.handle}?` : `Accept this appeal?`}
        description={
          restoreTarget === "kyte"
            ? "The page goes live again immediately, the owner is emailed that it's back, and the appellant is emailed that the appeal was accepted."
            : restoreTarget === "org"
              ? "Every kyte the org suspension took down goes live again, and the appellant is emailed that the appeal was accepted."
              : restoreTarget === "user"
                ? "The account is active again and every org this suspension took down comes back. The appellant is emailed that the appeal was accepted."
                : "Nothing is suspended any more, so this just closes the appeal — the appellant is emailed that it was accepted."
        }
        confirmLabel={restoreTarget !== null ? "Accept & restore" : "Accept appeal"}
        tone="default"
        details={[
          { label: APPEAL_KIND_LABELS[row.kind], value: row.handle },
          { label: "They're emailed at", value: row.email },
          ...(trimmedNote ? [{ label: "Your note", value: trimmedNote }] : []),
        ]}
        busy={busy}
        onConfirm={() => void resolve("RESOLVED")}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={confirming === "deny"}
        title={`Deny the appeal for ${row.handle}?`}
        description="The suspension stands and the appeal closes. They're emailed that a person reviewed it — they can appeal again if something changes."
        confirmLabel="Deny appeal"
        tone="warning"
        details={[
          { label: APPEAL_KIND_LABELS[row.kind], value: row.handle },
          { label: "They're emailed at", value: row.email },
          ...(trimmedNote ? [{ label: "Your note", value: trimmedNote }] : []),
        ]}
        busy={busy}
        onConfirm={() => void resolve("DISMISSED")}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
