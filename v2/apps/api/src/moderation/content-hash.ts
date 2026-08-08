import { createHash } from "node:crypto";
import type { ModerationKyteSnapshot } from "./types";

const FIELD_SEPARATOR = "";
const ITEM_SEPARATOR = "";

export function computeContentHash(
  snapshot: Pick<
    ModerationKyteSnapshot,
    "username" | "displayName" | "description" | "links" | "icons" | "avatarAssetId" | "redirectUrl"
  >,
): string {
  const parts = [
    snapshot.username ?? "",
    snapshot.displayName ?? "",
    snapshot.description ?? "",
    snapshot.links.map((link) => `${link.title}${ITEM_SEPARATOR}${link.url}`).join(ITEM_SEPARATOR),
    snapshot.icons.map((icon) => icon.url ?? "").join(ITEM_SEPARATOR),
    snapshot.avatarAssetId ?? "",
    snapshot.redirectUrl ?? "",
  ];
  return createHash("sha256").update(parts.join(FIELD_SEPARATOR)).digest("hex");
}
