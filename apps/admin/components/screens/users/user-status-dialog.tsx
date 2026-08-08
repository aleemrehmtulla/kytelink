import { ConfirmDialog } from "../../ui/confirm-dialog";
import { formatNumber } from "../../../lib/format";
import { plural, restoreUserCopy, suspendUserCopy } from "../moderation/moderation-copy";

export const REASON_LABEL = "Reason (recorded in the audit log)";
const REASON_PLACEHOLDER = "e.g. phishing links in bio — reported 4×";

export type UserStatusIntent =
  | { kind: "suspend"; email: string; orgCount: number; kyteCount: number }
  | { kind: "restore"; email: string }
  | { kind: "bulk-suspend"; count: number };

export interface UserStatusDialogProps {
  intent: UserStatusIntent | null;
  busy: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * There is no cascade checkbox: suspending a person always suspends every org
 * they belong to, and restoring only lifts the ones that cascade created. The
 * dialog states that instead of offering a switch the server doesn't have.
 */
export function UserStatusDialog({
  intent,
  busy,
  error,
  onConfirm,
  onCancel,
}: UserStatusDialogProps) {
  if (!intent) return null;

  const shared = {
    open: true,
    busy,
    error,
    requireReason: true,
    reasonLabel: REASON_LABEL,
    reasonPlaceholder: REASON_PLACEHOLDER,
    reasonMinLength: 3,
    onConfirm: (reason: string) => onConfirm(reason),
    onCancel,
  } as const;

  if (intent.kind === "bulk-suspend") {
    return (
      <ConfirmDialog
        {...shared}
        title={`Suspend ${formatNumber(intent.count)} accounts`}
        description={`Suspend ${formatNumber(
          intent.count,
        )} accounts? For each one, every org they belong to goes down with them and every kyte in those orgs goes offline. They can still log in, see why, and appeal. Reversible.`}
        confirmLabel={`Suspend ${formatNumber(intent.count)} accounts`}
        tone="danger"
        typeToConfirm="suspend"
        details={[
          { label: "Accounts selected", value: formatNumber(intent.count) },
          { label: "Reason applied", value: "The same reason is recorded for every account" },
        ]}
      />
    );
  }

  if (intent.kind === "suspend") {
    return (
      <ConfirmDialog
        {...shared}
        title="Suspend account"
        description={suspendUserCopy(intent.email, intent.kyteCount)}
        confirmLabel="Suspend account"
        tone="danger"
        typeToConfirm={intent.email}
        details={[
          { label: "Account", value: intent.email },
          {
            label: "Orgs suspended with them",
            value: `${formatNumber(intent.orgCount)} ${plural(intent.orgCount, "org")}`,
          },
          {
            label: "Kytes going offline",
            value: `${formatNumber(intent.kyteCount)} published`,
          },
        ]}
      />
    );
  }

  return (
    <ConfirmDialog
      {...shared}
      title="Restore account"
      description={restoreUserCopy(intent.email)}
      confirmLabel="Restore account"
      tone="warning"
      details={[
        { label: "Account", value: intent.email },
        { label: "Current status", value: "Suspended" },
      ]}
    />
  );
}
