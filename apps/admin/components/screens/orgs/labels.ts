import { MODERATION_STATUSES, type ModerationStatus, type Role } from "@kytelink/schemas";

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

const MODERATION_LABELS: Record<ModerationStatus, string> = {
  APPROVED: "Live",
  SUSPENDED: "Suspended",
};

export const MODERATION_FILTERS: readonly { value: ModerationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...MODERATION_STATUSES.map((status) => ({ value: status, label: MODERATION_LABELS[status] })),
];

export const ASSET_KIND_LABELS: Record<"image" | "avatar" | "og", string> = {
  image: "Link image",
  avatar: "Avatar",
  og: "Social preview",
};

export function kyteLabel(kyte: { username: string | null; displayName: string | null }): string {
  if (kyte.username) return `@${kyte.username}`;
  if (kyte.displayName) return kyte.displayName;
  return "Untitled kyte";
}

/** `DataTable` hands sort keys back as plain strings; this narrows one to the
 * union the procedure actually accepts instead of casting. */
export function sortHandler<T extends string>(
  keys: readonly T[],
  apply: (key: T, dir: "asc" | "desc") => void,
): (key: string, dir: "asc" | "desc") => void {
  return (key, dir) => {
    const match = keys.find((candidate) => candidate === key);
    if (match !== undefined) apply(match, dir);
  };
}
