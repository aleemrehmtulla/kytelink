import { ADMIN_AUDIT_ACTIONS, AUDIT_ACTIONS, type AuditAction } from "@kytelink/schemas";

const ADMIN_PREFIX = "admin.";

function labelSegment(segment: string): string {
  const words = segment.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function auditActionLabel(action: string): string {
  return action.split(".").map(labelSegment).join(" · ");
}

/** Drops the leading `admin` segment — admin rows are already badged as such. */
export function auditActionShortLabel(action: string): string {
  return auditActionLabel(action.startsWith(ADMIN_PREFIX) ? action.slice(ADMIN_PREFIX.length) : action);
}

function byLabel(a: AuditAction, b: AuditAction): number {
  return auditActionShortLabel(a).localeCompare(auditActionShortLabel(b));
}

export const ADMIN_ACTION_CHOICES: AuditAction[] = [...ADMIN_AUDIT_ACTIONS].sort(byLabel);

export const PRODUCT_ACTION_CHOICES: AuditAction[] = AUDIT_ACTIONS.filter(
  (action) => !action.startsWith(ADMIN_PREFIX),
).sort(byLabel);
