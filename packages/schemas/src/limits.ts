const MEGABYTE = 1024 * 1024;

export const LIMIT_DEFAULTS = {
  kytesPerOrg: 10,
  peoplePerOrg: 10,
  orgsOwnedPerUser: 3,
  orgsJoinedPerUser: 7,
  schedulesPerKyte: 3,
  storageBytesPerOrg: 250 * MEGABYTE,
  uploadMaxBytes: 10 * MEGABYTE,
} as const;

export type LimitKey = keyof typeof LIMIT_DEFAULTS;

export const TOTAL_ORGS_PER_USER =
  LIMIT_DEFAULTS.orgsOwnedPerUser + LIMIT_DEFAULTS.orgsJoinedPerUser;

export const LIMIT_OVERRIDE_CEILING = 100;

export const COUNT_LIMIT_KEYS: readonly LimitKey[] = [
  "kytesPerOrg",
  "peoplePerOrg",
  "orgsOwnedPerUser",
  "orgsJoinedPerUser",
  "schedulesPerKyte",
];

export const BYTE_LIMIT_KEYS: readonly LimitKey[] = ["storageBytesPerOrg", "uploadMaxBytes"];

/**
 * Count limits and byte limits cannot share a ceiling: 100 is a sane cap on
 * "kytes per org" and a nonsensical one on "bytes of storage", so validating
 * every override against LIMIT_OVERRIDE_CEILING silently made the two
 * byte-valued limits unsettable.
 */
export const LIMIT_OVERRIDE_CEILINGS: Record<LimitKey, number> = {
  kytesPerOrg: LIMIT_OVERRIDE_CEILING,
  peoplePerOrg: LIMIT_OVERRIDE_CEILING,
  orgsOwnedPerUser: LIMIT_OVERRIDE_CEILING,
  orgsJoinedPerUser: LIMIT_OVERRIDE_CEILING,
  schedulesPerKyte: LIMIT_OVERRIDE_CEILING,
  storageBytesPerOrg: 1024 * 1024 * MEGABYTE,
  uploadMaxBytes: 1024 * MEGABYTE,
};

export function limitOverrideCeiling(key: LimitKey): number {
  return LIMIT_OVERRIDE_CEILINGS[key];
}

export function resolveLimit(defaultValue: number, override?: number | null): number {
  return override ?? defaultValue;
}

export function isValidCountOverride(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= LIMIT_OVERRIDE_CEILING;
}

export function isValidLimitOverride(key: LimitKey, value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= limitOverrideCeiling(key);
}
