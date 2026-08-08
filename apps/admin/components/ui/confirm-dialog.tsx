import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger" | "warning";
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonMinLength?: number;
  typeToConfirm?: string;
  details?: { label: string; value: ReactNode }[];
  busy?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
}

const CONFIRM_TONE = {
  default: "primary",
  danger: "danger",
  warning: "warning",
} as const;

const INPUT_CLASSES =
  "rounded-input border-border bg-card text-ink placeholder:text-faint w-full border px-3 py-2 text-[13px]";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "default",
  requireReason = false,
  reasonLabel = "Reason (recorded in the audit log)",
  reasonPlaceholder = "e.g. phishing links in bio — reported 4×",
  reasonMinLength = 3,
  typeToConfirm,
  details,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setReason("");
      setTyped("");
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  const reasonOk = !requireReason || reason.trim().length >= reasonMinLength;
  // A blank `typeToConfirm` used to satisfy itself on an empty input, turning a
  // suspend-account dialog into a single click. Absent means "no gate";
  // present-but-blank is a caller bug and must fail closed.
  const typedOk =
    typeToConfirm === undefined ||
    (typeToConfirm.trim().length > 0 && typed.trim() === typeToConfirm);
  const canConfirm = reasonOk && typedOk && !busy;

  function confirm() {
    if (!canConfirm) return;
    void onConfirm(reason.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button tone="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            tone={CONFIRM_TONE[tone]}
            onClick={confirm}
            disabled={!canConfirm}
            busy={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="text-secondary text-[13px] leading-relaxed">{description}</div>

        {details && details.length > 0 ? (
          <dl className="rounded-input border-hairline bg-tint flex flex-col gap-1.5 border p-3">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-tertiary shrink-0 text-[12px]">{detail.label}</dt>
                <dd className="text-ink min-w-0 text-right text-[12px] font-medium [font-variant-numeric:tabular-nums]">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {requireReason ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-tertiary text-[12px] font-medium">{reasonLabel}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              maxLength={500}
              className={`${INPUT_CLASSES} resize-none leading-relaxed`}
            />
            <span className="text-faint text-[11px]">
              {reason.trim().length < reasonMinLength
                ? `At least ${reasonMinLength} characters.`
                : `${reason.trim().length} / 500`}
            </span>
          </label>
        ) : null}

        {typeToConfirm !== undefined ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-tertiary text-[12px] font-medium">
              Type <span className="text-ink font-mono">{typeToConfirm}</span> to confirm
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") confirm();
              }}
              autoComplete="off"
              spellCheck={false}
              className={`${INPUT_CLASSES} font-mono`}
            />
          </label>
        ) : null}

        {error ? (
          <p className="rounded-input border-danger-border bg-danger-soft text-danger border px-3 py-2 text-[12px]">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
