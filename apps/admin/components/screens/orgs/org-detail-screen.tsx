import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { LIMIT_DEFAULTS, limitOverrideCeiling, type LimitKey } from "@kytelink/schemas";
import { LimitEditor } from "../../limit-editor";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { CopyId } from "../../ui/copy-id";
import { Dropdown } from "../../ui/dropdown";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { StatGroup } from "../../ui/stat-group";
import { StatusPill } from "../../ui/status-pill";
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
import {
  isByteLimitKey,
  LIMIT_KEY_HINTS,
  LIMIT_KEY_LABELS,
  ORG_LIMIT_KEYS,
} from "../../../consts/limits";
import type { OrgDetail, OrgLimitOverrides } from "../../../lib/admin-source";
import {
  CONFIRM_TITLES,
  REASON_LABEL,
  REASON_PLACEHOLDER,
  restoreOrgCopy,
  suspendOrgCopy,
} from "../moderation/moderation-copy";
import { OrgKytesTable } from "./org-kytes-table";
import { OrgMembersTable } from "./org-members-table";
import { storageTone, storageUsagePct } from "./storage-meter";

export interface OrgDetailScreenProps {
  orgId: string;
}

const PCT_TEXT = {
  default: "text-tertiary",
  warning: "text-warning",
  danger: "text-danger",
} as const;

/**
 * `suspensionCause` is `user_<id>` when the org went down with one of its
 * members rather than by a direct admin action — the only case where the org's
 * own Restore button can't help.
 */
function causedByUserId(cause: string | null): string | null {
  if (cause === null || !cause.startsWith("user_")) return null;
  return cause.slice("user_".length) || null;
}

export function OrgDetailScreen({ orgId }: OrgDetailScreenProps) {
  const router = useRouter();
  const source = useAdminSource();
  const { toast } = useToast();
  const fetchOrg = useCallback(() => source.orgDetail(orgId), [source, orgId]);
  const { data, status, reload } = useAsync(fetchOrg);

  const [pending, setPending] = useState<"suspend" | "restore" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [lastData, setLastData] = useState<OrgDetail | null | undefined>(data);
  if (data !== lastData) {
    setLastData(data);
    setPending(null);
    setActionError(null);
  }

  const breadcrumbs = [
    { label: "Orgs & kytes", href: "/orgs" },
    { label: nonBlank(data?.name) ?? "Org" },
  ];

  if (status === "loading" && !data) {
    return (
      <>
        <PageHeader title="Org" breadcrumbs={breadcrumbs} />
        <LoadingState rows={6} />
      </>
    );
  }

  if (status === "error" || !data) {
    return (
      <>
        <PageHeader title="Org" breadcrumbs={breadcrumbs} />
        <ErrorState onRetry={reload} message="Couldn't load this org." />
      </>
    );
  }

  const org = data;
  const storagePct = storageUsagePct(org.storageBytes, org.storageLimitBytes);
  const tone = storageTone(storagePct);
  const suspended = org.suspendedAt !== null;
  const causeUserId = causedByUserId(org.suspensionCause);
  const cascaded = suspended && causeUserId !== null;

  async function runAction(action: "suspend" | "restore", reason: string) {
    setBusy(true);
    setActionError(null);
    try {
      if (action === "suspend") await source.suspendOrg({ orgId, reason });
      else await source.unsuspendOrg({ orgId, reason });
      setPending(null);
      toast(action === "suspend" ? `${org.name} is suspended.` : `${org.name} is live again.`);
      reload();
    } catch {
      setActionError("That action failed. Nothing changed.");
      toast("That action failed.", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={org.name}
        description={`Owned by ${org.ownerEmail} · Created ${formatDate(org.createdAt)}`}
        action={
          <>
            <StatusPill
              label={suspended ? "Suspended" : "Live"}
              tone={suspended ? "warning" : "success"}
            />
            {org.personal ? (
              <span
                className="rounded-pill bg-tint px-2.5 py-0.5 text-[12px] font-medium text-tertiary"
                title="Created automatically when this person signed up — not a shared workspace"
              >
                Personal org
              </span>
            ) : null}
            <a
              href={`mailto:${org.ownerEmail}`}
              className="cursor-pointer rounded-pill border border-border bg-card px-3 py-1 text-[12px] font-medium text-secondary hover:bg-tint hover:text-ink"
            >
              Email owner
            </a>
            <CopyId value={org.id} label="Org ID" />
            <Dropdown
              align="end"
              label="Org actions"
              trigger="Actions"
              items={[
                {
                  key: "storage",
                  label: "Open storage breakdown",
                  hint: "Every file this org holds",
                  onSelect: () => void router.push(`/storage/${org.id}`),
                },
                {
                  key: "copy",
                  label: "Copy org ID",
                  hint: org.id,
                  onSelect: () => {
                    void navigator.clipboard.writeText(org.id);
                    toast("Org ID copied.");
                  },
                },
              ]}
            />
          </>
        }
      />

      {suspended ? (
        <section className="mb-6 rounded-card border border-warning-border bg-warning-soft p-5">
          <h2 className="text-[13px] font-semibold text-warning">This org is suspended</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-secondary">
            {cascaded ? (
              <>
                Suspended because its member{" "}
                <Link
                  href={`/users/${causeUserId}`}
                  className="text-accent hover:text-accent-hover underline underline-offset-2"
                >
                  {causeUserId === org.ownerUserId ? org.ownerEmail : "this account"}
                </Link>{" "}
                was suspended. Restoring the user restores this org — the button below can&rsquo;t.
              </>
            ) : (
              "Every kyte in this org is down together. Members keep read-only access and can appeal."
            )}
          </p>
          <p className="mt-2 text-[13px] text-ink">
            {org.suspensionReason ? `“${org.suspensionReason}”` : "No reason was recorded."}
          </p>
          <p className="mt-1 text-[12px] text-tertiary">
            {`Set by ${org.suspendedBy ?? "an admin"}`}
            {org.suspendedAt ? (
              <>
                {" · "}
                <span title={formatDateTimeFull(org.suspendedAt)}>
                  {formatRelativeTime(org.suspendedAt)}
                </span>
              </>
            ) : null}
          </p>
        </section>
      ) : null}

      <div className="mb-6">
        <StatGroup
          items={[
            {
              key: "kytes",
              label: "Kytes",
              value: formatNumber(org.kyteCount),
              tone: org.suspendedKyteCount > 0 ? "warning" : "default",
              sub: (
                <>
                  {formatNumber(org.publishedKyteCount)} published
                  {org.suspendedKyteCount > 0 ? (
                    <span className="text-warning">
                      {" · "}
                      {formatNumber(org.suspendedKyteCount)} off the internet
                    </span>
                  ) : (
                    " · none off the internet"
                  )}
                </>
              ),
            },
            {
              key: "members",
              label: "Members",
              value: formatNumber(org.memberCount),
              sub: "People with access",
            },
            {
              key: "storage",
              label: "Storage used",
              value: formatBytes(org.storageBytes),
              href: `/storage/${org.id}`,
              tone,
              sub: (
                <>
                  {org.storageLimitBytes === null
                    ? "No override — the platform default applies"
                    : `of ${formatBytes(org.storageLimitBytes)} allowed`}
                  {storagePct === null ? null : (
                    <span className={PCT_TEXT[tone]}>
                      {" "}
                      · {Math.round(storagePct)}% used
                    </span>
                  )}
                </>
              ),
            },
            {
              key: "files",
              label: "Files",
              value: formatNumber(org.assetCount),
              sub: "Images, avatars, and social previews",
            },
          ]}
        />
      </div>

      <div className="mb-6">
        <LimitEditor
          key={orgId}
          title="Limit overrides"
          description="Raise or lower this org's ceilings. Blank means the platform default applies."
          fields={ORG_LIMIT_KEYS.map((key: LimitKey) => ({
            key,
            label: LIMIT_KEY_LABELS[key],
            hint: LIMIT_KEY_HINTS[key],
            defaultValue: LIMIT_DEFAULTS[key],
            value: org.limitOverrides[key as keyof OrgLimitOverrides],
            max: limitOverrideCeiling(key),
            ...(isByteLimitKey(key) ? { format: formatBytes } : {}),
          }))}
          onSave={async (values) => {
            await source.setOrgLimits({
              orgId,
              overrides: ORG_LIMIT_KEYS.map((key) => ({ key, value: values[key] ?? null })),
            });
            toast("Limits saved.");
            reload();
          }}
        />
      </div>

      <div className="mb-6 flex flex-col gap-6">
        <OrgMembersTable orgId={orgId} />
        <OrgKytesTable orgId={orgId} />
      </div>

      <section className="rounded-card border border-danger-border bg-card p-5">
        <h2 className="text-[13px] font-semibold text-danger">Danger zone</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-secondary">
          Suspending an org takes every kyte in it off the internet at once. It&rsquo;s recorded in
          the audit log with the reason you give, and it&rsquo;s reversible.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[13px] font-medium text-ink">
              {suspended ? "Restore the org" : "Suspend the org"}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-tertiary">
              {suspended
                ? cascaded
                  ? "This org went down with one of its members. Restore that account instead — restoring here won't hold."
                  : "Puts every kyte the suspension took down back online. Kytes suspended on their own stay down."
                : "Members keep read-only access and can appeal. Kytes suspended on their own stay down either way."}
            </p>
          </div>
          {suspended ? (
            <Button
              tone="success"
              size="sm"
              disabled={busy || cascaded}
              onClick={() => setPending("restore")}
            >
              Restore
            </Button>
          ) : (
            <Button tone="warning" size="sm" disabled={busy} onClick={() => setPending("suspend")}>
              Suspend
            </Button>
          )}
        </div>
      </section>

      {pending ? (
        <ConfirmDialog
          open
          title={pending === "suspend" ? CONFIRM_TITLES.suspendOrg : CONFIRM_TITLES.restoreOrg}
          description={
            pending === "suspend"
              ? suspendOrgCopy(org.name, org.personal)
              : restoreOrgCopy(org.name)
          }
          confirmLabel={pending === "suspend" ? "Suspend org" : "Restore org"}
          tone={pending === "suspend" ? "warning" : "default"}
          requireReason
          reasonLabel={REASON_LABEL}
          reasonPlaceholder={REASON_PLACEHOLDER}
          reasonMinLength={3}
          details={[
            { label: "Org", value: org.personal ? `${org.name} (personal)` : org.name },
            { label: "Owner", value: org.ownerEmail },
            {
              label: "Kytes affected",
              value: `${formatNumber(org.publishedKyteCount)} published of ${formatNumber(
                org.kyteCount,
              )}`,
            },
            { label: "Members", value: formatNumber(org.memberCount) },
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
