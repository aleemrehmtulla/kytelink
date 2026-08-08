import type Redis from "ioredis";
import type { PrismaClient } from "@kytelink/db";
import type { Logger } from "pino";

const KYTE_MAP_PREFIX = "analytics:kyte-map:";
const TOMBSTONE = "NONE";
const TOMBSTONE_TTL_SEC = 60;

export function kyteMapKey(username: string): string {
  return `${KYTE_MAP_PREFIX}${username}`;
}

export interface MembershipDeps {
  redis: Pick<Redis, "get" | "set">;
  db: Pick<PrismaClient, "publishedKyte">;
  log?: Pick<Logger, "warn" | "error">;
}

async function lookupPostgres(deps: MembershipDeps, username: string): Promise<string | null> {
  const row = await deps.db.publishedKyte.findUnique({
    where: { username },
    select: { kyteId: true },
  });
  return row?.kyteId ?? null;
}

// Redis set hit/miss lookup with a Postgres fallback on miss, caching the
// answer back (hit persists until the next publish rebuilds it; a miss is a
// short-lived NONE tombstone so a flushed/restarted Redis degrades to a few
// extra Postgres lookups instead of silently dropping every profile's
// analytics until republish) — doc 07.
export async function resolvePublishedKyteId(deps: MembershipDeps, username: string): Promise<string | null> {
  const key = kyteMapKey(username);
  try {
    const cached = await deps.redis.get(key);
    if (cached === TOMBSTONE) return null;
    if (cached) return cached;
  } catch (error) {
    deps.log?.warn({ err: error, username }, "analytics: redis kyte-map read failed, falling back to postgres");
  }

  let kyteId: string | null;
  try {
    kyteId = await lookupPostgres(deps, username);
  } catch (error) {
    deps.log?.error({ err: error, username }, "analytics: postgres kyte-map fallback failed");
    return null;
  }

  try {
    if (kyteId) {
      await deps.redis.set(key, kyteId);
    } else {
      await deps.redis.set(key, TOMBSTONE, "EX", TOMBSTONE_TTL_SEC);
    }
  } catch (error) {
    deps.log?.warn({ err: error, username }, "analytics: redis kyte-map write failed");
  }

  return kyteId;
}

export interface ValidatedMembership {
  valid: boolean;
  kyteId: string | null;
}

// Resolves kyteId strictly from username (never from the client-supplied
// value) and only treats the beacon as legitimate when the claimed kyteId
// matches — this is what kills a spoofed kyteId rather than silently
// re-attributing the hit.
export async function validateKyteMembership(
  deps: MembershipDeps,
  username: string,
  claimedKyteId: string,
): Promise<ValidatedMembership> {
  const resolved = await resolvePublishedKyteId(deps, username);
  if (resolved === null) return { valid: false, kyteId: null };
  if (resolved !== claimedKyteId) {
    deps.log?.warn({ username, claimedKyteId }, "analytics: kyte_id spoof rejected");
    return { valid: false, kyteId: null };
  }
  return { valid: true, kyteId: resolved };
}

// Called on every publish so the validation set stays warm instead of paying
// for the Postgres fallback on the next beacon.
export async function refreshKyteMembership(
  redis: Pick<Redis, "set">,
  username: string,
  kyteId: string,
): Promise<void> {
  await redis.set(kyteMapKey(username), kyteId);
}

export async function clearKyteMembership(redis: Pick<Redis, "del">, username: string): Promise<void> {
  await redis.del(kyteMapKey(username));
}
