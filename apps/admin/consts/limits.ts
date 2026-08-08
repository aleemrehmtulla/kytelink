import { BYTE_LIMIT_KEYS, type LimitKey } from "@kytelink/schemas";

export const LIMIT_KEY_LABELS: Record<LimitKey, string> = {
  kytesPerOrg: "Kytes per org",
  peoplePerOrg: "People per org",
  orgsOwnedPerUser: "Orgs owned per user",
  orgsJoinedPerUser: "Orgs joined per user",
  schedulesPerKyte: "Pending schedules per kyte",
  storageBytesPerOrg: "Storage per org",
  uploadMaxBytes: "Max upload size",
};

/** Byte-valued limits are stored as raw byte counts, so the field has to say so
 * outright — nobody reads 262144000 as "250 MB". The stated bounds are the real
 * per-key ceilings the server enforces via `isValidLimitOverride`. */
export const LIMIT_KEY_HINTS: Partial<Record<LimitKey, string>> = {
  storageBytesPerOrg: "Whole bytes, up to 1 TB (1,099,511,627,776). 1 MB is 1,048,576.",
  uploadMaxBytes: "Whole bytes per file, up to 1 GB (1,073,741,824). 1 MB is 1,048,576.",
};

export const ORG_LIMIT_KEYS: LimitKey[] = [
  "kytesPerOrg",
  "peoplePerOrg",
  "schedulesPerKyte",
  "storageBytesPerOrg",
  "uploadMaxBytes",
];

export function isByteLimitKey(key: LimitKey): boolean {
  return BYTE_LIMIT_KEYS.includes(key);
}
