import type { AssetKind } from "@kytelink/schemas";

const KIND_FOLDER: Record<Extract<AssetKind, "AVATAR" | "LINK_IMAGE">, string> = {
  AVATAR: "avatar",
  LINK_IMAGE: "links",
};

export function buildRawUploadKey(kyteId: string, assetId: string): string {
  return `raw/${kyteId}/${assetId}`;
}

export function buildAssetKey(
  kyteId: string,
  kind: "AVATAR" | "LINK_IMAGE",
  ulid: string,
  ext: string,
): string {
  return `u/${kyteId}/${KIND_FOLDER[kind]}/${ulid}.${ext}`;
}

export function buildOgKey(kyteId: string, contentHash: string): string {
  return `u/${kyteId}/og/${contentHash}.png`;
}

export function buildLqipKey(key: string): string {
  const lastDot = key.lastIndexOf(".");
  if (lastDot === -1) return `${key}.lqip`;
  return `${key.slice(0, lastDot)}.lqip${key.slice(lastDot)}`;
}

const QUARANTINE_PREFIX = "q/";
const LIVE_PREFIX = "u/";

export function quarantineKeyFor(liveKey: string): string {
  if (!liveKey.startsWith(LIVE_PREFIX)) {
    throw new Error(`cannot quarantine a non-live key: ${liveKey}`);
  }
  return `${QUARANTINE_PREFIX}${liveKey.slice(LIVE_PREFIX.length)}`;
}

export function liveKeyFor(quarantineKey: string): string {
  if (!quarantineKey.startsWith(QUARANTINE_PREFIX)) {
    throw new Error(`not a quarantine key: ${quarantineKey}`);
  }
  return `${LIVE_PREFIX}${quarantineKey.slice(QUARANTINE_PREFIX.length)}`;
}

export function liveKyteObjectPrefix(kyteId: string): string {
  return `${LIVE_PREFIX}${kyteId}/`;
}

export function quarantineKyteObjectPrefix(kyteId: string): string {
  return `${QUARANTINE_PREFIX}${kyteId}/`;
}

export function isOwnedByKyte(key: string, kyteId: string): boolean {
  return key.startsWith(`u/${kyteId}/`) || key.startsWith(`q/${kyteId}/`) || key.startsWith(`raw/${kyteId}/`);
}
