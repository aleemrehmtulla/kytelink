import { ConfirmDialog } from "../../ui/confirm-dialog";
import { REASON_LABEL } from "./user-status-dialog";

export interface ImpersonateIntent {
  email: string;
  name: string | null;
}

export interface ImpersonateDialogProps {
  intent: ImpersonateIntent | null;
  readOnly: boolean;
  busy: boolean;
  error: string | null;
  onReadOnlyChange: (readOnly: boolean) => void;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ImpersonateDialog({
  intent,
  readOnly,
  busy,
  error,
  onReadOnlyChange,
  onConfirm,
  onCancel,
}: ImpersonateDialogProps) {
  if (!intent) return null;

  return (
    <ConfirmDialog
      open
      busy={busy}
      error={error}
      title="View the product as this user"
      tone={readOnly ? "default" : "warning"}
      description={
        <>
          <p>
            {`Opens ${intent.email}'s editor in a new tab, exactly as they see it, and anything you change there is a real change to their account. Your admin session is untouched — this dashboard stays yours, and the session ends on its own after 30 minutes.`}
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[13px] text-secondary">
            <input
              type="checkbox"
              checked={readOnly}
              onChange={(event) => onReadOnlyChange(event.target.checked)}
              className="mt-0.5 cursor-pointer accent-accent"
            />
            <span>
              Read-only — look without being able to change anything. Leave this off if you might
              need to fix something while you are in there.
            </span>
          </label>
        </>
      }
      confirmLabel={readOnly ? "Start read-only session" : "Start session"}
      requireReason
      reasonLabel={REASON_LABEL}
      reasonPlaceholder="e.g. support ticket #412 — links vanish after publish"
      reasonMinLength={3}
      details={[
        { label: "Account", value: intent.email },
        { label: "Access", value: readOnly ? "Read-only" : "Full — can change their data" },
        { label: "Expires", value: "30 minutes after you start" },
      ]}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
