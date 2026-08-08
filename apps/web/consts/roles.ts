import type { Role } from "@kytelink/schemas";

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Full control, including billing and deleting the team.",
  ADMIN: "Manage people, settings, and every page.",
  MANAGER: "Publish, schedule, and manage domains — not people.",
  EDITOR: "Edit drafts and create preview links. A manager ships changes.",
  VIEWER: "Read-only access. No analytics.",
};

export const INVITABLE_ROLE_LIST: Role[] = ["ADMIN", "MANAGER", "EDITOR", "VIEWER"];
