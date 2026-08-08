import Link from "next/link";
import { CopyId } from "../../ui/copy-id";
import { DetailList } from "../../ui/detail-list";
import { ModerationStatusPill, StatusPill, UserStatusPill } from "../../ui/status-pill";
import {
  formatBytes,
  formatDate,
  nonBlank,
} from "../../../lib/format";
import type { ModerationTarget } from "../../../lib/admin-source";
import { plural } from "./moderation-copy";

export interface ModerationTargetCardProps {
  target: ModerationTarget;
}

export function ModerationTargetCard({ target }: ModerationTargetCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-accent-border bg-accent-soft/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">
            {target.username ? `@${target.username}` : "Kyte without a username"}
          </p>
          <p className="truncate text-[13px] text-secondary">
            {nonBlank(target.displayName) ?? "No display name"} · {target.orgName}
            {target.orgPersonal ? " (personal org)" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[12px]">
          {target.publicUrl ? (
            <a
              href={target.publicUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="cursor-pointer font-medium text-accent hover:text-accent-hover"
            >
              Live page ↗
            </a>
          ) : null}
          <Link
            href={`/orgs/${target.orgId}/${target.kyteId}`}
            className="cursor-pointer font-medium text-accent hover:text-accent-hover"
          >
            Kyte detail
          </Link>
          {target.userId ? (
            <Link
              href={`/users/${target.userId}`}
              className="cursor-pointer font-medium text-accent hover:text-accent-hover"
            >
              Owner
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.06em] text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          Kyte <ModerationStatusPill status={target.moderationStatus} />
        </span>
        <span className="inline-flex items-center gap-1.5">
          Org <StatusPill label={target.orgSuspended ? "Suspended" : "Live"} tone={target.orgSuspended ? "warning" : "success"} />
        </span>
        <span className="inline-flex items-center gap-1.5">
          Owner <UserStatusPill status={target.userStatus} />
        </span>
      </div>

      {target.orgSuspended ? (
        <p className="text-[12px] text-secondary">
          {target.orgName} is already suspended, so this page is down with it. Restoring the org
          brings it back.
        </p>
      ) : null}

      <DetailList
        items={[
          { label: "Owner email", value: target.ownerEmail },
          {
            label: "Their published kytes",
            value: `${target.ownerPublishedKyteCount} across every org they're in`,
          },
          {
            label: "Open reports",
            value:
              target.openReportCount === 0
                ? "None"
                : `${target.openReportCount} ${plural(target.openReportCount, "report")}`,
          },
          { label: "Published", value: target.published ? "Yes" : "Never published" },
          { label: "Storage", value: formatBytes(target.storageBytes) },
          { label: "Created", value: formatDate(target.createdAt) },
          { label: "Kyte ID", value: <CopyId value={target.kyteId} label="Kyte ID" /> },
        ]}
      />

      {!target.published ? (
        <p className="text-[12px] text-secondary">
          This kyte has never been published, so suspending it changes nothing publicly. Org- and
          account-level suspensions still take down everything else they run.
        </p>
      ) : null}
    </div>
  );
}
