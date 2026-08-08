import { TRPCError } from "@trpc/server";
import type Redis from "ioredis";
import type { Logger } from "pino";
import type { PrismaClient } from "@kytelink/db";
import {
  eventBeaconSchema,
  linkBeaconSchema,
  pageBeaconSchema,
  productEventPropsSchemas,
  type LinkBeacon,
  type RateLimitClass,
} from "@kytelink/schemas";
import {
  formatClickhouseTimestamp,
  type Clickhouse,
  type LinkHitRow,
  type PageHitRow,
  type ProductEventRow,
} from "@kytelink/clickhouse";
import { beaconEnvelopeSchema, type BeaconEnvelope } from "./beacon-envelope";
import { RedisRateLimiter } from "./beacon-rate-limit";
import { resolveBotFlag } from "./bot-flag";
import { insertOrBuffer } from "./clickhouse-buffer";
import { resolveDeviceType } from "./device";
import { resolveCountry } from "./geo";
import { hashIp } from "./ip-hash";
import { validateKyteMembership } from "./kyte-membership";
import { resolveRefDomain } from "./ref-domain";
import type { RateLimitSubjectValues, RateLimiter } from "../trpc/rate-limit";
import { enforceRateLimit } from "../trpc/rate-limit";

type BeaconKind = "page" | "link" | "event";

export interface IngestDeps {
  ch: Clickhouse;
  redis: Redis;
  db: Pick<PrismaClient, "publishedKyte">;
  log: Logger;
}

async function checkRateLimit(
  limiter: RateLimiter,
  className: RateLimitClass,
  values: RateLimitSubjectValues,
  log: Pick<Logger, "warn">,
): Promise<boolean> {
  try {
    await enforceRateLimit(limiter, className, values, { failOpen: true });
    return true;
  } catch (error) {
    if (error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS") return false;
    log.warn({ err: error, className }, "rate limiter unavailable — letting this beacon through (fail open)");
    return true;
  }
}

async function ingestPageOrLinkBeacon(
  deps: IngestDeps,
  kind: "page" | "link",
  envelope: BeaconEnvelope,
  limiter: RateLimiter,
): Promise<void> {
  const schema = kind === "page" ? pageBeaconSchema : linkBeaconSchema;
  const parsed = schema.safeParse(envelope.body);
  if (!parsed.success) {
    deps.log.warn({ kind }, "dropped a beacon — its body failed validation");
    return;
  }

  const membership = await validateKyteMembership(
    { redis: deps.redis, db: deps.db, log: deps.log },
    parsed.data.username,
    parsed.data.kyteId,
  );
  if (!membership.valid || !membership.kyteId) return;

  const kyteAllowed = await checkRateLimit(
    limiter,
    "beacon-per-kyte",
    { ip: envelope.ip, kyte: membership.kyteId },
    deps.log,
  );
  if (!kyteAllowed) return;

  const base: PageHitRow = {
    ts: formatClickhouseTimestamp(new Date()),
    kyte_id: membership.kyteId,
    username: parsed.data.username,
    referrer: parsed.data.referrer ?? "",
    ref_domain: resolveRefDomain(parsed.data.referrer),
    country: resolveCountry(envelope.headers ?? {}),
    device: resolveDeviceType(envelope.userAgent),
    ip_hash: hashIp(envelope.ip),
    is_bot: resolveBotFlag(envelope.userAgent),
  };

  if (kind === "page") {
    await insertOrBuffer<PageHitRow>(deps, "page_hits", [base], (rows) => deps.ch.insertPageHits(rows));
    return;
  }

  const linkParsed = parsed.data as LinkBeacon;
  const linkRow: LinkHitRow = { ...base, link_url: linkParsed.linkUrl, link_title: linkParsed.linkTitle };
  await insertOrBuffer<LinkHitRow>(deps, "link_hits", [linkRow], (rows) => deps.ch.insertLinkHits(rows));
}

async function ingestEventBeacon(deps: IngestDeps, envelope: BeaconEnvelope): Promise<void> {
  const parsed = eventBeaconSchema.safeParse(envelope.body);
  if (!parsed.success) {
    deps.log.warn("dropped an event beacon — its body failed validation");
    return;
  }

  const propsSchema = productEventPropsSchemas[parsed.data.event];
  const rawProps = parsed.data.properties ?? {};
  const withRef = parsed.data.ref !== undefined ? { ...rawProps, ref: parsed.data.ref } : rawProps;
  const propsResult = propsSchema.safeParse(withRef);
  const fallbackResult = propsResult.success ? propsResult : propsSchema.safeParse(rawProps);
  if (!fallbackResult.success) {
    deps.log.warn({ event: parsed.data.event }, "dropped an event beacon — its properties failed validation");
    return;
  }

  const row: ProductEventRow = {
    ts: formatClickhouseTimestamp(new Date()),
    event: parsed.data.event,
    user_id: envelope.sessionUserId ?? "",
    kyte_id: "",
    anonymous_id: parsed.data.anonymousId ?? "",
    properties: JSON.stringify(fallbackResult.data),
  };

  await insertOrBuffer<ProductEventRow>(deps, "product_events", [row], (rows) => deps.ch.insertProductEvents(rows));
}

async function ingestBeaconUnsafe(deps: IngestDeps, kind: BeaconKind, rawPayload: unknown): Promise<void> {
  const envelopeResult = beaconEnvelopeSchema.safeParse(rawPayload);
  if (!envelopeResult.success) {
    deps.log.warn({ kind }, "dropped a beacon — its envelope failed validation");
    return;
  }
  const envelope = envelopeResult.data;

  const limiter = new RedisRateLimiter(deps.redis);
  const ipAllowed = await checkRateLimit(limiter, "beacon", { ip: envelope.ip }, deps.log);
  if (!ipAllowed) return;

  if (kind === "event") {
    await ingestEventBeacon(deps, envelope);
    return;
  }

  await ingestPageOrLinkBeacon(deps, kind, envelope, limiter);
}

// Beacons never 5xx and never block (doc 07) — every failure inside the
// pipeline is caught and logged here so a floating `void ingestBeacon(...)`
// promise from the route shell can never reject.
export async function ingestBeacon(deps: IngestDeps, kind: BeaconKind, rawPayload: unknown): Promise<void> {
  try {
    await ingestBeaconUnsafe(deps, kind, rawPayload);
  } catch (error) {
    deps.log.error({ err: error, kind }, "beacon ingestion threw — the event is lost, the response still succeeds");
  }
}
