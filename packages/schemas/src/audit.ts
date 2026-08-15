import { z } from "zod";

export const AUDIT_ACTIONS = [
  "publish",
  "schedule.create",
  "schedule.update",
  "schedule.cancel",
  "schedule.fire",
  "username.change",
  "domain.add",
  "domain.remove",
  "member.invite",
  "member.accept",
  "member.decline",
  "member.revoke",
  "member.role-change",
  "member.remove",
  "kyte.create",
  "kyte.delete",
  "preview.create",
  "preview.rotate",
  "email.change",
  "admin.user.suspend",
  "admin.user.unsuspend",
  "admin.user.ban",
  "admin.user.force-logout",
  "admin.user.impersonate.start",
  "admin.user.impersonate.stop",
  "admin.user.limits",
  "admin.org.limits",
  "admin.org.suspend",
  "admin.org.unsuspend",
  "admin.kyte.suspend",
  "admin.kyte.unsuspend",
  "admin.kyte.uphold",
  "admin.kyte.delete",
  "admin.kyte.re-review",
  "admin.moderation.sweep",
  "admin.moderation.sweep.cancel",
  "admin.asset.delete",
  "admin.report.action",
  "admin.report.open",
  "admin.appeal.resolve",
  "admin.alert.resolve",
  "admin.alert.unresolve",
  "admin.export",
] as const;

// Admin actions are the only audit rows that can exist without an org (a
// platform-level user suspension isn't scoped to one), which is why
// AuditLog.orgId is nullable.
export const ADMIN_AUDIT_ACTIONS = AUDIT_ACTIONS.filter((action) =>
  action.startsWith("admin."),
) as readonly AuditAction[];

export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
