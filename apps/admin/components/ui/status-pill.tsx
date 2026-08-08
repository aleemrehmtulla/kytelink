import type { ModerationStatus, UserStatus } from "@kytelink/schemas";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export interface StatusPillProps {
  label: string;
  tone: StatusTone;
}

// Every tone carries a border so a filled pill and the white neutral pill are
// the same size in the same table column.
const TONE_CLASSES: Record<StatusTone, string> = {
  success: "border-transparent bg-success-soft text-success",
  warning: "border-transparent bg-warning-soft text-warning",
  danger: "border-transparent bg-danger-soft text-danger",
  neutral: "border-hairline bg-card text-secondary",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-faint",
};

export function StatusPill({ label, tone }: StatusPillProps) {
  return (
    <span
      className={`rounded-pill inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[12px] font-medium ${TONE_CLASSES[tone]}`}
    >
      <span
        className={`rounded-pill h-1.5 w-1.5 ${DOT_CLASSES[tone]}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

const USER_STATUS_PILL: Record<UserStatus, StatusPillProps> = {
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "warning" },
};

const MODERATION_STATUS_PILL: Record<ModerationStatus, StatusPillProps> = {
  APPROVED: { label: "Live", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "warning" },
};

export function UserStatusPill({ status }: { status: UserStatus }) {
  const pill = USER_STATUS_PILL[status];
  return <StatusPill label={pill.label} tone={pill.tone} />;
}

export function ModerationStatusPill({ status }: { status: ModerationStatus }) {
  const pill = MODERATION_STATUS_PILL[status];
  return <StatusPill label={pill.label} tone={pill.tone} />;
}
