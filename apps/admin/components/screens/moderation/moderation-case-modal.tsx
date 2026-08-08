import { useEffect, useState } from "react";
import type { AbuseReportReason } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { Modal } from "../../ui/modal";
import { useToast } from "../../ui/toast";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import type { ModerationTarget } from "../../../lib/admin-source";
import {
  ABUSE_REASON_LABELS,
  ABUSE_REASON_OPTIONS,
  IMMEDIATE_ACTION_OPTIONS,
  immediateActionCopy,
  immediateActionTitle,
  plural,
  type ImmediateAction,
} from "./moderation-copy";
import { ModerationTargetCard } from "./moderation-target-card";
import { parseUsernameInput, truncate } from "./moderation-text";
import { nonBlank } from "../../../lib/format";

const DETAILS_MIN = 3;
const DETAILS_MAX = 500;

const FIELD =
  "w-full rounded-input border border-border bg-card px-3 py-2 text-[13px] text-ink placeholder:text-faint";
const FIELD_LABEL = "block text-[13px] font-medium text-ink";

interface Lookup {
  username: string;
  target: ModerationTarget | null;
  failed: boolean;
}

export interface ModerationCaseResult {
  username: string;
  reportId: string;
  action: ImmediateAction;
}

export interface ModerationCaseModalProps {
  onClose: () => void;
  onOpened: (result: ModerationCaseResult) => void;
}

/**
 * Two pages, not three stacked steps: page one only ever asks "is this the
 * right account?", and enforcement options don't exist until that's answered.
 * Mounted only while the flow is open, so every open starts from a blank form.
 */
export function ModerationCaseModal({ onClose, onOpened }: ModerationCaseModalProps) {
  const source = useAdminSource();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [raw, setRaw] = useState("");
  const [reason, setReason] = useState<AbuseReportReason | "">("");
  const [details, setDetails] = useState("");
  const [chosenAction, setChosenAction] = useState<ImmediateAction>("none");
  const [acknowledgedMiss, setAcknowledgedMiss] = useState<string | null>(null);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ username: string; message: string } | null>(null);

  const parsed = parseUsernameInput(raw);
  const debounced = useDebouncedValue(parsed, 300);
  const settled = parsed.length > 0 && parsed === debounced;

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    source
      .resolveModerationTarget(debounced)
      .then((target) => {
        if (!cancelled) setLookup({ username: debounced, target, failed: false });
      })
      .catch(() => {
        if (!cancelled) setLookup({ username: debounced, target: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [settled, debounced, source]);

  const resolved = lookup !== null && settled && lookup.username === parsed ? lookup : null;
  const searching = parsed.length > 0 && resolved === null;
  const target = resolved && !resolved.failed ? resolved.target : null;
  const missing = resolved !== null && !resolved.failed && resolved.target === null;
  const caseWithoutTarget = missing && acknowledgedMiss === parsed;

  const action = isActionAllowed(chosenAction, target) ? chosenAction : "none";
  const trimmedDetails = details.trim();
  const detailsValid =
    trimmedDetails.length >= DETAILS_MIN && trimmedDetails.length <= DETAILS_MAX;
  const targetReady = target !== null || caseWithoutTarget;
  const error = failure && failure.username === parsed ? failure.message : null;
  const canContinue = parsed.length > 0 && !searching && targetReady;
  const canSubmit = canContinue && reason !== "" && detailsValid && !busy;

  async function submit() {
    if (reason === "") return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await source.openModerationCase({
        username: parsed,
        reason,
        details: trimmedDetails,
        immediateAction: action,
      });
      toast(successMessage(action, parsed, target?.ownerEmail ?? null), { tone: "success" });
      setConfirming(false);
      onOpened({ username: parsed, reportId: result.reportId, action });
    } catch {
      setFailure({
        username: parsed,
        message: "Couldn't open the case. Nothing was changed — try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  function onSubmitClick() {
    if (!canSubmit) return;
    setFailure(null);
    if (action === "none") {
      void submit();
      return;
    }
    setConfirming(true);
  }

  // Only the account-wide suspension gets a typed confirmation: it is the one
  // choice whose blast radius reaches orgs and kytes the admin isn't looking at.
  const typeToConfirm =
    action === "suspend_user" ? (nonBlank(target?.ownerEmail) ?? "suspend account") : undefined;

  return (
    <>
      <Modal
        open={!confirming}
        onClose={onClose}
        title={step === 1 ? "Find the account" : "Decide what happens"}
        description={
          step === 1
            ? "Nothing gets suspended until the right account is on screen."
            : `Opening a case against @${target?.username ?? parsed}.`
        }
        size="lg"
        footer={
          step === 1 ? (
            <>
              <Button tone="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button tone="primary" onClick={() => setStep(2)} disabled={!canContinue}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button tone="secondary" onClick={() => setStep(1)} disabled={busy}>
                Back
              </Button>
              <Button
                tone={
                  action === "none" ? "primary" : action === "suspend_user" ? "danger" : "warning"
                }
                onClick={onSubmitClick}
                disabled={!canSubmit}
                busy={busy}
              >
                {action === "none" ? "Open case" : immediateActionTitle(action)}
              </Button>
            </>
          )
        }
      >
        <StepBar step={step} />

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="case-username" className={FIELD_LABEL}>
                Username
              </label>
              <input
                id="case-username"
                type="text"
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                placeholder="@name, name, or kytelink.com/name"
                autoComplete="off"
                spellCheck={false}
                className={`mt-1.5 ${FIELD}`}
              />
              <p className="text-tertiary mt-1.5 text-[12px]">
                A bare handle, an @handle, or a pasted profile link all work.
              </p>
            </div>

            {parsed.length === 0 ? null : searching ? (
              <p className="text-tertiary text-[13px]">Searching for @{parsed}…</p>
            ) : resolved?.failed ? (
              <p className="text-danger text-[13px]">
                Couldn&apos;t look up @{parsed}. Check the connection and try again.
              </p>
            ) : target ? (
              <ModerationTargetCard target={target} />
            ) : (
              <div className="rounded-card border-border flex flex-col gap-3 border p-4">
                <p className="text-ink text-[13px] font-medium">No kyte found for @{parsed}.</p>
                <p className="text-secondary text-[13px]">
                  Nothing can be suspended without a target. Check the spelling, or log the case
                  against the username on its own.
                </p>
                <label className="text-secondary flex cursor-pointer items-start gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={caseWithoutTarget}
                    onChange={(event) =>
                      setAcknowledgedMiss(event.target.checked ? parsed : null)
                    }
                    className="accent-accent mt-0.5 cursor-pointer"
                  />
                  <span>Open a case for @{parsed} anyway — report only, no enforcement.</span>
                </label>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="case-reason" className={FIELD_LABEL}>
                Category
              </label>
              <select
                id="case-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value as AbuseReportReason | "")}
                className={`mt-1.5 cursor-pointer ${FIELD}`}
              >
                <option value="">Choose a category…</option>
                {ABUSE_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="case-details" className={FIELD_LABEL}>
                Reason (recorded in the audit log)
              </label>
              <textarea
                id="case-details"
                value={details}
                onChange={(event) => setDetails(event.target.value.slice(0, DETAILS_MAX))}
                rows={3}
                placeholder="e.g. phishing links in bio — reported 4×"
                className={`mt-1.5 resize-y leading-relaxed ${FIELD}`}
              />
              <p className="text-tertiary mt-1 flex flex-wrap justify-between gap-2 text-[12px]">
                <span>Quoted back to the owner and kept in the audit log.</span>
                <span className="tabular-nums">
                  {trimmedDetails.length}/{DETAILS_MAX}
                </span>
              </p>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className={`mb-1 ${FIELD_LABEL}`}>Enforcement</legend>
              {IMMEDIATE_ACTION_OPTIONS.map((option) => {
                const disabled = !isActionAllowed(option.value, target);
                const blocked = target === null ? null : blockedReason(option.value, target);
                return (
                  <label
                    key={option.value}
                    className={`rounded-input flex items-start gap-2.5 border px-3 py-2.5 ${
                      disabled
                        ? "border-hairline cursor-not-allowed opacity-55"
                        : action === option.value
                          ? "border-accent-border bg-accent-soft cursor-pointer"
                          : "border-border bg-card hover:bg-tint cursor-pointer"
                    }`}
                  >
                    <input
                      type="radio"
                      name="case-action"
                      value={option.value}
                      checked={action === option.value}
                      disabled={disabled}
                      onChange={() => setChosenAction(option.value)}
                      className="accent-accent mt-0.5 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="min-w-0">
                      <span className="text-ink block text-[13px] font-medium">
                        {optionLabel(option.value, option.label, target)}
                      </span>
                      <span className="text-secondary block text-[12px] leading-relaxed">
                        {optionConsequence(option.value, option.consequence, target)}
                      </span>
                      {blocked ? (
                        <span className="text-tertiary block text-[12px]">{blocked}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
              {target === null ? (
                <p className="text-tertiary text-[12px]">
                  This case has no account behind it, so it can only be logged as a report.
                </p>
              ) : null}
            </fieldset>

            {error ? <p className="text-danger text-[12px]">{error}</p> : null}
          </div>
        )}
      </Modal>

      {confirming && target ? (
        <ConfirmDialog
          open
          title={immediateActionTitle(action)}
          description={immediateActionCopy(action, target)}
          confirmLabel={immediateActionTitle(action)}
          tone={action === "suspend_user" ? "danger" : "warning"}
          typeToConfirm={typeToConfirm}
          details={[
            { label: "Kyte", value: target.username ? `@${target.username}` : parsed },
            {
              label: "Org",
              value: target.orgPersonal ? `${target.orgName} (personal)` : target.orgName,
            },
            { label: "Owner", value: target.ownerEmail },
            ...(action === "suspend_user"
              ? [
                  {
                    label: "Goes offline",
                    value: `${target.ownerPublishedKyteCount} published ${plural(
                      target.ownerPublishedKyteCount,
                      "kyte",
                    )} across every org they're in`,
                  },
                ]
              : []),
            { label: "Category", value: reason === "" ? "—" : ABUSE_REASON_LABELS[reason] },
            { label: "Reason", value: truncate(trimmedDetails, 160) },
          ]}
          busy={busy}
          error={error}
          onConfirm={() => void submit()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}

function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <ol className="mb-5 flex items-center gap-2" aria-label={`Step ${step} of 2`}>
      {[1, 2].map((index) => (
        <li
          key={index}
          aria-current={index === step ? "step" : undefined}
          className={`rounded-pill h-1 flex-1 ${index <= step ? "bg-accent" : "bg-hairline"}`}
        />
      ))}
    </ol>
  );
}

function isActionAllowed(action: ImmediateAction, target: ModerationTarget | null): boolean {
  if (action === "none") return true;
  if (target === null) return false;
  // Whatever is already down can't be chosen again: the effective moderation
  // status folds in the org cascade, so a kyte under a suspended org reads
  // SUSPENDED here even though nobody suspended the kyte itself.
  if (action === "suspend_kyte") return target.moderationStatus !== "SUSPENDED";
  if (action === "suspend_org") return !target.orgSuspended;
  return target.userId !== null && target.userStatus !== "SUSPENDED";
}

function blockedReason(action: ImmediateAction, target: ModerationTarget): string | null {
  if (action === "suspend_kyte" && target.moderationStatus === "SUSPENDED") {
    return target.orgSuspended
      ? "Already down — the whole org is suspended."
      : "Already suspended.";
  }
  if (action === "suspend_org" && target.orgSuspended) return "This org is already suspended.";
  if (action === "suspend_user") {
    if (target.userId === null) return "This kyte has no owner account on file.";
    if (target.userStatus === "SUSPENDED") return "This account is already suspended.";
  }
  return null;
}

function optionLabel(
  action: ImmediateAction,
  fallback: string,
  target: ModerationTarget | null,
): string {
  if (action !== "suspend_org" || target === null) return fallback;
  return target.orgPersonal
    ? `Suspend ${target.orgName} — their personal org`
    : `Suspend ${target.orgName}`;
}

function optionConsequence(
  action: ImmediateAction,
  fallback: string,
  target: ModerationTarget | null,
): string {
  if (target === null) return fallback;
  if (action === "suspend_org" && target.orgPersonal) {
    return "A personal org holds only their own pages, so this is every kyte they publish alone.";
  }
  if (action === "suspend_user") {
    return `Every org they belong to is suspended too — ${target.ownerPublishedKyteCount} published ${plural(
      target.ownerPublishedKyteCount,
      "kyte",
    )} go down. They can still log in and appeal.`;
  }
  return fallback;
}

function successMessage(
  action: ImmediateAction,
  username: string,
  ownerEmail: string | null,
): string {
  switch (action) {
    case "suspend_kyte":
      return `@${username} suspended and the case is logged.`;
    case "suspend_org":
      return `The org behind @${username} is suspended and the case is logged.`;
    case "suspend_user":
      return `${ownerEmail ?? "The owner"} is suspended, along with their orgs.`;
    case "none":
      return `Case opened for @${username}.`;
  }
}
