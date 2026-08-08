import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { THEME_DISPLAY_NAMES, type ModerationStatus } from "@kytelink/schemas";
import { TimeSeriesChart } from "@kytelink/ui";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { CopyId } from "../../ui/copy-id";
import { DetailList } from "../../ui/detail-list";
import { Dropdown } from "../../ui/dropdown";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { Section } from "../../ui/section";
import { StatGroup } from "../../ui/stat-group";
import { ModerationStatusPill, UserStatusPill } from "../../ui/status-pill";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import {
  formatBytes,
  formatDate,
  formatDateTimeFull,
  formatNumber,
  formatRelativeTime,
  nonBlank,
} from "../../../lib/format";
import type { KyteDetail } from "../../../lib/admin-source";
import {
  restoreKyteCopy,
  suspendKyteCopy,
} from "../moderation/moderation-copy";
import { KyteAssetsTable } from "./kyte-assets-table";
import { KyteModerationTimeline, KytePublishTimeline } from "./kyte-moderation-timeline";
import { kyteLabel } from "./labels";

export interface KyteDetailScreenProps {
  kyteId: string;
}

type ModerationAction = "suspend" | "unsuspend" | "reReview";

interface ActionCopy {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "warning" | "default";
  requireReason: boolean;
  nextStatus: ModerationStatus | null;
}

function actionCopy(action: ModerationAction, kyte: KyteDetail): ActionCopy {
  const label = kyteLabel(kyte);
  switch (action) {
    case "suspend":
      return {
        title: `Suspend ${label}?`,
        description: suspendKyteCopy(kyte.username),
        confirmLabel: "Suspend page",
        tone: "warning",
        requireReason: true,
        nextStatus: "SUSPENDED",
      };
    case "unsuspend":
      return {
        title: `Restore ${label}?`,
        description: restoreKyteCopy(kyte.username),
        confirmLabel: "Restore page",
        tone: "default",
        requireReason: true,
        nextStatus: "APPROVED",
      };
    case "reReview":
      return {
        title: "Force a re-review?",
        description:
          "The current published content is queued for a fresh moderation pass. Nothing changes publicly until that pass returns a verdict.",
        confirmLabel: "Queue re-review",
        tone: "default",
        requireReason: false,
        nextStatus: null,
      };
  }
}

export function KyteDetailScreen({ kyteId }: KyteDetailScreenProps) {
  const router = useRouter();
  const source = useAdminSource();
  const { toast } = useToast();
  const fetchKyte = useCallback(() => source.kyteDetail(kyteId), [source, kyteId]);
  const { data, status, reload } = useAsync(fetchKyte);

  const [statusOverride, setStatusOverride] = useState<ModerationStatus | null>(null);
  const [removedAssetIds, setRemovedAssetIds] = useState<string[]>([]);
  const [pending, setPending] = useState<ModerationAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [lastData, setLastData] = useState<KyteDetail | null | undefined>(data);
  if (data !== lastData) {
    setLastData(data);
    setStatusOverride(null);
    setRemovedAssetIds([]);
  }

  const assets = useMemo(
    () => (data?.assets ?? []).filter((asset) => !removedAssetIds.includes(asset.id)),
    [data?.assets, removedAssetIds],
  );

  if (status === "loading" && !data) {
    return (
      <>
        <PageHeader title="Kyte" breadcrumbs={[{ label: "Orgs & kytes", href: "/orgs" }]} />
        <LoadingState rows={6} />
      </>
    );
  }

  if (status === "error" || !data) {
    return (
      <>
        <PageHeader title="Kyte" breadcrumbs={[{ label: "Orgs & kytes", href: "/orgs" }]} />
        <ErrorState onRetry={reload} message="Couldn't load this kyte." />
      </>
    );
  }

  const kyte = data;
  const moderationStatus = statusOverride ?? kyte.moderationStatus;
  const label = kyteLabel(kyte);
  const assetBytes = assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);
  const viewsTotal = kyte.trafficSparkline.reduce((sum, point) => sum + point.views, 0);
  const rangeStart = kyte.trafficSparkline[0]?.date;
  const rangeEnd = kyte.trafficSparkline[kyte.trafficSparkline.length - 1]?.date;
  const lastPublishedAt = kyte.publishHistory.reduce<string | null>(
    (latest, entry) => (latest === null || entry.publishedAt > latest ? entry.publishedAt : latest),
    null,
  );

  async function runAction(action: ModerationAction, reason: string) {
    const copy = actionCopy(action, kyte);
    const previous = statusOverride;
    setBusy(true);
    setActionError(null);
    if (copy.nextStatus) setStatusOverride(copy.nextStatus);
    try {
      if (action === "suspend") await source.suspendKyte({ kyteId, reason });
      if (action === "unsuspend") await source.unsuspendKyte({ kyteId, reason });
      if (action === "reReview") await source.forceReReviewKyte(kyteId);
      setPending(null);
      toast(
        action === "reReview" ? "Queued for re-review." : `${label} is now ${STATE_WORD[action]}.`,
      );
      reload();
    } catch {
      setStatusOverride(previous);
      setActionError("That action failed. Nothing changed.");
      toast("That action failed.", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAsset(assetId: string, reason: string) {
    setRemovedAssetIds((prev) => [...prev, assetId]);
    try {
      await source.deleteAsset({ assetId, reason });
      toast("File deleted.");
      reload();
    } catch (caught) {
      setRemovedAssetIds((prev) => prev.filter((id) => id !== assetId));
      toast("Couldn't delete that file.", { tone: "danger" });
      throw caught;
    }
  }

  const dangerRows: { key: ModerationAction; heading: string; body: string; button: ReactNode }[] =
    [];
  if (moderationStatus === "SUSPENDED") {
    dangerRows.push({
      key: "unsuspend",
      heading: "Restore the page",
      body: "Puts the page back online with its current published content.",
      button: (
        <Button tone="success" size="sm" onClick={() => setPending("unsuspend")} disabled={busy}>
          Restore
        </Button>
      ),
    });
  } else {
    dangerRows.push({
      key: "suspend",
      heading: "Suspend the page",
      body: "Takes the page off the internet. The owner keeps read access to their content and can appeal.",
      button: (
        <Button tone="warning" size="sm" onClick={() => setPending("suspend")} disabled={busy}>
          Suspend
        </Button>
      ),
    });
  }
  dangerRows.push({
    key: "reReview",
    heading: "Force a re-review",
    body: "Queues the published content for a fresh moderation pass. Nothing changes publicly until it returns a verdict.",
    button: (
      <Button tone="secondary" size="sm" onClick={() => setPending("reReview")} disabled={busy}>
        Re-review
      </Button>
    ),
  });

  const copy = pending ? actionCopy(pending, kyte) : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Orgs & kytes", href: "/orgs" },
          { label: kyte.orgName, href: `/orgs/${kyte.orgId}` },
          { label },
        ]}
        title={label}
        description={`Owned by ${kyte.ownerEmail} · Created ${formatDate(kyte.createdAt)}`}
        action={
          <>
            <ModerationStatusPill status={moderationStatus} />
            {kyte.publicUrl ? (
              <a
                href={kyte.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="cursor-pointer rounded-pill border border-border bg-card px-3 py-1 text-[12px] font-medium text-secondary hover:bg-tint hover:text-ink"
              >
                Open public page ↗
              </a>
            ) : null}
            <CopyId value={kyte.id} label="Kyte ID" />
            <Dropdown
              align="end"
              label="Kyte actions"
              trigger="Actions"
              items={[
                {
                  key: "org",
                  label: "View org",
                  hint: kyte.orgName,
                  onSelect: () => void router.push(`/orgs/${kyte.orgId}`),
                },
                {
                  key: "storage",
                  label: "Open storage breakdown",
                  onSelect: () => void router.push(`/storage/${kyte.orgId}`),
                },
                {
                  key: "email",
                  label: "Email owner",
                  hint: kyte.ownerEmail,
                  onSelect: () => {
                    window.location.href = `mailto:${kyte.ownerEmail}`;
                  },
                },
                { key: "sep", separator: true },
                {
                  key: "reReview",
                  label: "Force a re-review",
                  hint: "Re-runs the moderation pass",
                  onSelect: () => setPending("reReview"),
                },
                {
                  key: "copy",
                  label: "Copy kyte ID",
                  hint: kyte.id,
                  onSelect: () => {
                    void navigator.clipboard.writeText(kyte.id);
                    toast("Kyte ID copied.");
                  },
                },
              ]}
            />
          </>
        }
      />

      {kyte.ownerStatus !== "ACTIVE" ? (
        <p className="mb-6 rounded-card border border-warning-border bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-warning">
          The owner&rsquo;s account is suspended —{" "}
          {kyte.ownerUserId ? (
            <Link href={`/users/${kyte.ownerUserId}`} className="underline underline-offset-2">
              {kyte.ownerEmail}
            </Link>
          ) : (
            kyte.ownerEmail
          )}{" "}
          can still sign in and read their content, but can&rsquo;t change it. That suspension also
          took down every org they belong to; restoring the account brings those back.
        </p>
      ) : null}

      <div className="mb-6">
        <StatGroup
          items={[
            {
              key: "views",
              label: "Views",
              value: formatNumber(viewsTotal),
              sub:
                kyte.trafficSparkline.length > 0
                  ? `Last ${kyte.trafficSparkline.length} days`
                  : "No traffic recorded",
            },
            {
              key: "storage",
              label: "Storage",
              value: formatBytes(kyte.storageBytes),
              href: `/storage/${kyte.orgId}`,
              sub: `${formatNumber(assets.length)} file${assets.length === 1 ? "" : "s"}`,
            },
            {
              key: "publishes",
              label: "Publishes",
              value: formatNumber(kyte.publishHistory.length),
              sub: lastPublishedAt
                ? `Last ${formatRelativeTime(lastPublishedAt)}`
                : "Never published",
            },
            {
              key: "members",
              label: "People with access",
              value: formatNumber(kyte.memberCount),
              sub: "Through this org's membership",
            },
          ]}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Section title="Details">
          <DetailList
            items={[
              {
                label: "Owner",
                value: (
                  <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {kyte.ownerUserId ? (
                      <Link
                        href={`/users/${kyte.ownerUserId}`}
                        className="text-accent hover:text-accent-hover"
                      >
                        {kyte.ownerEmail}
                      </Link>
                    ) : (
                      kyte.ownerEmail
                    )}
                    <UserStatusPill status={kyte.ownerStatus} />
                  </span>
                ),
              },
              {
                label: "Org",
                value: (
                  <Link
                    href={`/orgs/${kyte.orgId}`}
                    className="text-accent hover:text-accent-hover"
                  >
                    {kyte.orgName}
                  </Link>
                ),
              },
              {
                label: "Public page",
                value: kyte.publicUrl ? (
                  <a
                    href={kyte.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:text-accent-hover"
                  >
                    {kyte.publicUrl.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "No username claimed yet"
                ),
              },
              {
                label: "State",
                value: kyte.published ? "Published" : "Draft — never gone live",
              },
              { label: "Theme", value: THEME_DISPLAY_NAMES[kyte.theme] },
              {
                label: "Display name",
                value: nonBlank(kyte.displayName) ?? "Not set",
              },
              {
                label: "Created",
                value: (
                  <span title={formatDateTimeFull(kyte.createdAt)}>
                    {formatRelativeTime(kyte.createdAt)}
                  </span>
                ),
              },
            ]}
          />
        </Section>

        <Section
          title="Traffic"
          description={
            rangeStart && rangeEnd
              ? `${formatNumber(viewsTotal)} views · ${formatDate(rangeStart)} – ${formatDate(rangeEnd)}`
              : "No traffic recorded yet."
          }
        >
          <TimeSeriesChart
            data={kyte.trafficSparkline.map((point) => ({ date: point.date, views: point.views }))}
            height={120}
            ariaLabel={`Views over the last ${kyte.trafficSparkline.length} days, ${formatNumber(
              viewsTotal,
            )} total`}
          />
        </Section>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Section
          title="Moderation history"
          description="The evidence trail. Quote this back when someone asks why their page went down."
        >
          <KyteModerationTimeline entries={kyte.moderationHistory} />
        </Section>
        <Section title="Publish history" description="Every time this page went live.">
          <KytePublishTimeline entries={kyte.publishHistory} />
        </Section>
      </div>

      <div className="mb-6">
        <KyteAssetsTable assets={assets} totalBytes={assetBytes} onDelete={deleteAsset} />
      </div>

      <section className="rounded-card border border-danger-border bg-card p-5">
        <h2 className="text-[13px] font-semibold text-danger">Danger zone</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-secondary">
          These change what the public sees. Every one is recorded in the audit log with the reason
          you give.
        </p>
        <div className="mt-4 flex flex-col">
          {dangerRows.map((row, index) => (
            <div
              key={row.key}
              className={`flex flex-wrap items-center justify-between gap-3 ${
                index > 0 ? "mt-3 border-t border-hairline pt-3" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">{row.heading}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-tertiary">{row.body}</p>
              </div>
              {row.button}
            </div>
          ))}
        </div>
      </section>

      {copy && pending ? (
        <ConfirmDialog
          open
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirmLabel}
          tone={copy.tone}
          requireReason={copy.requireReason}
          reasonLabel="Reason (recorded in the audit log)"
          reasonPlaceholder="e.g. phishing links in bio — reported 4×"
          details={[
            { label: "Kyte", value: label },
            { label: "Org", value: kyte.orgName },
            { label: "Owner", value: kyte.ownerEmail },
            { label: "Currently", value: <ModerationStatusPill status={moderationStatus} /> },
          ]}
          busy={busy}
          error={actionError}
          onConfirm={(reason) => runAction(pending, reason)}
          onCancel={() => {
            setPending(null);
            setActionError(null);
          }}
        />
      ) : null}
    </>
  );
}

const STATE_WORD: Record<ModerationAction, string> = {
  suspend: "suspended",
  unsuspend: "live again",
  reReview: "queued",
};
