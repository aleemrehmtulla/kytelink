import { limitReached } from "@kytelink/trpc";
import { LIMIT_DEFAULTS, type LimitKey, resolveLimit } from "@kytelink/schemas";
import type { OrgRow } from "../store/store";

function limitFor(org: OrgRow, key: LimitKey): number {
  return resolveLimit(LIMIT_DEFAULTS[key], org.limitOverrides[key]);
}

export function assertCountLimit(current: number, org: OrgRow, key: LimitKey): void {
  if (current >= limitFor(org, key)) {
    throw limitReached(`Limit reached for ${key} (${limitFor(org, key)}).`);
  }
}
