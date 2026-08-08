import { Button } from "../../ui/button";
import { formatDateTimeFull, formatRelativeTime } from "../../../lib/format";

export interface UserStatusBannerProps {
  statusReason: string | null;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  onRestore: () => void;
  restoreDisabled?: boolean;
  restoreHint?: string;
}

export function UserStatusBanner({
  statusReason,
  statusChangedAt,
  statusChangedBy,
  onRestore,
  restoreDisabled = false,
  restoreHint,
}: UserStatusBannerProps) {
  return (
    <section
      aria-labelledby="user-status-banner-title"
      className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-card border border-warning-border bg-warning-soft p-5"
    >
      <div className="min-w-0 max-w-2xl">
        <h2 id="user-status-banner-title" className="text-[13px] font-semibold text-warning">
          This account is suspended
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-secondary">
          They can still log in and read their content, but not change it. Every org they belong to
          is suspended too, so those kytes are offline. Restoring the account brings them back.
        </p>
        <p className="mt-2 text-[13px] text-ink">
          {statusReason ? `“${statusReason}”` : "No reason was recorded."}
        </p>
        <p className="mt-1 text-[12px] text-tertiary">
          {`Set by ${statusChangedBy ?? "an admin"}`}
          {statusChangedAt ? (
            <>
              {" · "}
              <span title={formatDateTimeFull(statusChangedAt)}>
                {formatRelativeTime(statusChangedAt)}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Button size="sm" tone="secondary" disabled={restoreDisabled} onClick={onRestore}>
          Restore account…
        </Button>
        {restoreHint ? <span className="text-[12px] text-tertiary">{restoreHint}</span> : null}
      </div>
    </section>
  );
}
