import { z } from "zod";

export const ROLES = ["OWNER", "ADMIN", "MANAGER", "EDITOR", "VIEWER"] as const;
export const roleSchema = z.enum(ROLES);
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  OWNER: 5,
  ADMIN: 4,
  MANAGER: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export const KYTE_ACCESS = ["ALL", "SELECTED"] as const;
export const kyteAccessSchema = z.enum(KYTE_ACCESS);
export type KyteAccess = (typeof KYTE_ACCESS)[number];

export type OrgMemberRef = { role: Role; kyteAccess: KyteAccess };
export type KyteMemberRef = { role: Role };

export function effectiveRole(
  orgMember: OrgMemberRef,
  kyteMember?: KyteMemberRef | null,
): Role | null {
  if (orgMember.role === "OWNER" || orgMember.role === "ADMIN") return orgMember.role;
  if (kyteMember) return kyteMember.role;
  return orgMember.kyteAccess === "ALL" ? orgMember.role : null;
}

// KyteMember rows exist ONLY while kyteAccess = SELECTED; OWNER/ADMIN are
// org-wide (ALL) with no per-kyte rows (04-organizations.md).
export function isKyteAccessInvariantValid(
  orgMember: OrgMemberRef,
  hasKyteMemberRows: boolean,
): boolean {
  if (orgMember.role === "OWNER" || orgMember.role === "ADMIN") {
    return orgMember.kyteAccess === "ALL" && !hasKyteMemberRows;
  }
  if (orgMember.kyteAccess === "ALL") return !hasKyteMemberRows;
  return true;
}

export const ACTIONS = [
  "view_editor",
  "view_analytics",
  "edit_draft",
  "upload_asset",
  "create_preview_link",
  "publish",
  "schedule",
  "cancel_schedule",
  "change_username",
  "manage_domains",
  "create_kyte",
  "manage_members",
  "manage_org_settings",
  "delete_kyte",
  "delete_org",
  "manage_owners",
] as const;

export type Action = (typeof ACTIONS)[number];

export const ACTION_MIN_ROLE: Record<Action, Role> = {
  view_editor: "VIEWER",
  view_analytics: "EDITOR",
  edit_draft: "EDITOR",
  upload_asset: "EDITOR",
  create_preview_link: "EDITOR",
  publish: "MANAGER",
  schedule: "MANAGER",
  cancel_schedule: "MANAGER",
  change_username: "MANAGER",
  manage_domains: "MANAGER",
  create_kyte: "ADMIN",
  manage_members: "ADMIN",
  manage_org_settings: "ADMIN",
  delete_kyte: "OWNER",
  delete_org: "OWNER",
  manage_owners: "OWNER",
};

export function can(role: Role, action: Action): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[ACTION_MIN_ROLE[action]];
}

export function canManageMember(actorRole: Role, targetRole: Role): boolean {
  return can(actorRole, "manage_members") && ROLE_RANK[targetRole] < ROLE_RANK[actorRole];
}

export const SELECTED_GRANT_ROLES = ["MANAGER", "EDITOR", "VIEWER"] as const;
