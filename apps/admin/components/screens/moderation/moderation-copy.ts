import { ABUSE_REPORT_REASONS } from "@kytelink/schemas";
import type { AbuseReportReason, AppealKind, AppealStatus, ReportStatus } from "@kytelink/schemas";
import type {
  ModerationSignal,
  ModerationTarget,
  OpenModerationCaseInput,
  SuspendedRow,
} from "../../../lib/admin-source";

export type ImmediateAction = NonNullable<OpenModerationCaseInput["immediateAction"]>;
export type SuspensionSource = SuspendedRow["source"];
export type SuspensionScope = SuspendedRow["scope"];

export const REASON_LABEL = "Reason (recorded in the audit log)";
export const REASON_PLACEHOLDER = "e.g. phishing links in bio — reported 4×";

export const ABUSE_REASON_LABELS: Record<AbuseReportReason, string> = {
  impersonation: "Impersonation",
  nsfw: "NSFW or adult content",
  other: "Other",
};

export const ABUSE_REASON_OPTIONS: { value: AbuseReportReason; label: string }[] =
  ABUSE_REPORT_REASONS.map((reason) => ({ value: reason, label: ABUSE_REASON_LABELS[reason] }));

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: "Open",
  ACTIONED: "Actioned",
  DISMISSED: "Dismissed",
};

export const APPEAL_STATUS_LABELS: Record<AppealStatus, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const APPEAL_KIND_LABELS: Record<AppealKind, string> = {
  kyte: "Kyte",
  org: "Org",
  user: "Account",
};

export const SUSPENSION_SOURCE_LABELS: Record<SuspensionSource, string> = {
  auto: "automated review",
  "seed-sweep": "seed sweep",
  manual: "admin review",
};

export const SUSPENSION_SCOPE_LABELS: Record<SuspensionScope, string> = {
  kyte: "Kyte suspended",
  org: "Org suspended",
};

export const SIGNAL_OPTIONS: { key: ModerationSignal["key"]; label: string }[] = [
  { key: "sus_links", label: "Sus links" },
  { key: "sus_names", label: "Sus names" },
  { key: "sus_redirect", label: "Sus redirects" },
  { key: "sus_email_domain", label: "Sus email domains" },
  { key: "nsfw", label: "NSFW" },
];

function kyteHandle(username: string | null): string {
  return username ? `@${username}` : "this kyte";
}

export function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

// Every suspension string says the same three things: what goes down, what the
// person can still do, and that they can appeal. We suspend liberally precisely
// because appealing is one form away, so nothing here is written as final.
export function suspendKyteCopy(username: string | null): string {
  return `Suspend ${kyteHandle(
    username,
  )}? The page shows a suspended notice and the owner keeps editor access to read (not change) their content. They can appeal — reversible any time.`;
}

export function restoreKyteCopy(username: string | null): string {
  return `Restore ${kyteHandle(
    username,
  )}? The page goes live again immediately with its current published content.`;
}

// Deletion copy breaks the "nothing here is final" rule on purpose: these two
// actions ARE final, and the copy has to say so without softening it.
export function deleteKyteCopy(username: string | null): string {
  return `Permanently delete ${kyteHandle(
    username,
  )}? The page, its draft, publish history, and every uploaded file are erased, and ${
    username ? `@${username}` : "its username"
  } is freed for anyone to claim. This cannot be undone.`;
}

export function banUserCopy(email: string): string {
  return `Ban ${email}? Their account, every org they own, and every kyte and file in those orgs are permanently erased. Their usernames are freed, and this email can never sign up again. This cannot be undone — there is no appeal.`;
}

export function suspendOrgCopy(orgName: string, personal: boolean): string {
  return personal
    ? `Suspend ${orgName}? This is their personal org, so every kyte in it goes down together. The owner keeps read access and can appeal — reversible any time.`
    : `Suspend ${orgName}? Every kyte in the org goes down together and its members keep read-only access. They can appeal — reversible any time.`;
}

export function restoreOrgCopy(orgName: string): string {
  return `Restore ${orgName}? Every kyte the org suspension took down goes live again. Kytes suspended on their own stay down.`;
}

export function suspendUserCopy(email: string, publishedKytes?: number): string {
  const radius =
    publishedKytes === undefined
      ? ""
      : ` That's ${publishedKytes} published ${plural(publishedKytes, "kyte")} today.`;
  return `Suspend ${email}? Everything they touch goes down: every org they belong to and every kyte in those orgs.${radius} They can still log in, see why, and appeal. Reversible.`;
}

export function restoreUserCopy(email: string): string {
  return `Restore ${email}? They're active again, and every org this suspension took down comes back with them. Orgs and kytes suspended on their own stay down.`;
}

export const DISMISS_REPORT_COPY =
  "Dismiss this report? The kyte stays online and the report is closed as no action. The reporter isn't notified.";

export function bulkRestoreKytesCopy(count: number): string {
  return `Restore ${count} ${plural(
    count,
    "kyte",
  )}? Each page goes live again immediately with its current published content.`;
}

export const RESOLVE_APPEAL_COPY =
  "Mark this appeal resolved? Use it once you've acted — lifting the suspension or explaining it to them. The appeal closes; nothing is suspended or restored by this.";

export const DISMISS_APPEAL_COPY =
  "Dismiss this appeal? The suspension stands and the appeal closes. They can send another one if something changes.";

export const IMMEDIATE_ACTION_OPTIONS: {
  value: ImmediateAction;
  label: string;
  consequence: string;
  scope: "case" | "kyte" | "org" | "user";
}[] = [
  {
    value: "none",
    label: "Open case only",
    consequence: "Nothing goes down. The case is logged so another admin can pick it up.",
    scope: "case",
  },
  {
    value: "suspend_kyte",
    label: "Suspend kyte",
    consequence:
      "This page shows a suspended notice. The owner keeps read access to their content and can appeal.",
    scope: "kyte",
  },
  {
    value: "suspend_org",
    label: "Suspend org",
    consequence: "Every kyte in the org goes down together. Its members keep read-only access.",
    scope: "org",
  },
  {
    value: "suspend_user",
    label: "Suspend user",
    consequence:
      "Every org they belong to is suspended too, so every kyte in those orgs goes down. They can still log in and appeal.",
    scope: "user",
  },
];

export function immediateActionCopy(action: ImmediateAction, target: ModerationTarget): string {
  switch (action) {
    case "suspend_kyte":
      return suspendKyteCopy(target.username);
    case "suspend_org":
      return suspendOrgCopy(target.orgName, target.orgPersonal);
    case "suspend_user":
      return suspendUserCopy(target.ownerEmail, target.ownerPublishedKyteCount);
    case "none":
      return "The case is logged and nothing goes down.";
  }
}

export const CONFIRM_TITLES = {
  suspendKyte: "Suspend kyte",
  restoreKyte: "Restore kyte",
  suspendOrg: "Suspend org",
  restoreOrg: "Restore org",
  suspendUser: "Suspend account",
  restoreUser: "Restore account",
  dismissReport: "Dismiss report",
  resolveAppeal: "Resolve appeal",
  dismissAppeal: "Dismiss appeal",
} as const;

export function immediateActionTitle(action: ImmediateAction): string {
  switch (action) {
    case "suspend_kyte":
      return CONFIRM_TITLES.suspendKyte;
    case "suspend_org":
      return CONFIRM_TITLES.suspendOrg;
    case "suspend_user":
      return CONFIRM_TITLES.suspendUser;
    case "none":
      return "Open case";
  }
}
