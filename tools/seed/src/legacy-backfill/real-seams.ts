import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isPrivateIp, stripBrackets } from "@kytelink/api/src/import/ssrf-fetch";
import { kyteMapKey, refreshKyteMembership } from "@kytelink/api/src/analytics/kyte-membership";
import { sharpNormalizeModule } from "@kytelink/api/src/assets/sharp-normalize";
import Redis from "ioredis";
import {
  ImageFetchError,
  type AssetStore,
  type BeaconValidationSink,
  type ImageFetcher,
  type MigrationSeams,
} from "./seams";

// This is the real, non-fixture wiring for `backfill --execute` (D2, P4-FINDINGS.md):
// sharp-normalize is imported directly from apps/api (compile-time bound, not a
// duck-typed copy), so a real proving run runs actual images through the actual
// sharp pipeline apps/api uses in production. See seams.ts for the stub used by
// dry-runs and the fast vitest unit tests.

const FETCH_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;
const MAX_RETRIES = 5;
const MAX_RESPONSE_BYTES = 25 * 1024 * 1024;

function assertSafeUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ImageFetchError("only http/https urls are allowed", rawUrl, "ssrf");
  }
  return url;
}

async function assertSafeHostname(url: URL): Promise<void> {
  const host = stripBrackets(url.hostname);
  const literalFamily = isIP(host);
  if (literalFamily !== 0) {
    if (isPrivateIp(host)) throw new ImageFetchError("refusing a private-address literal", url.toString(), "ssrf");
    return;
  }
  const lowered = host.toLowerCase();
  if (lowered === "localhost" || lowered.endsWith(".local") || lowered.endsWith(".internal")) {
    throw new ImageFetchError("refusing an internal hostname", url.toString(), "ssrf");
  }
  let records: { address: string }[];
  try {
    records = await dnsLookup(host, { all: true });
  } catch (error) {
    throw new ImageFetchError(`dns lookup failed: ${(error as Error).message}`, url.toString(), "dead");
  }
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new ImageFetchError("host resolves to a private address", url.toString(), "ssrf");
    }
  }
  if (records.length === 0) throw new ImageFetchError("host did not resolve", url.toString(), "dead");
}

async function fetchOnce(rawUrl: string): Promise<Uint8Array> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const url = assertSafeUrl(current);
    await assertSafeHostname(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "KytelinkLegacyBackfill/1.0" },
      });
    } catch (error) {
      throw new ImageFetchError(`fetch failed: ${(error as Error).message}`, rawUrl, "timeout");
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new ImageFetchError("redirect without a location header", rawUrl, "dead");
      current = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) {
      throw new ImageFetchError(`upstream returned ${response.status}`, rawUrl, "dead");
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
      throw new ImageFetchError("response exceeds the size cap", rawUrl, "not_image");
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      throw new ImageFetchError("response exceeds the size cap", rawUrl, "not_image");
    }
    return new Uint8Array(buffer);
  }
  throw new ImageFetchError("too many redirects", rawUrl, "dead");
}

// SSRF-guarded (DNS pre-check against private/loopback/link-local ranges,
// http(s)-only, bounded redirects, size-capped, timeout-bounded) — deliberately
// simpler than apps/api's ssrf-fetch (no per-request socket pinning against a
// DNS-rebind TOCTOU, which apps/api itself notes as an accepted low-severity gap
// [S7]): this tool runs once, offline, against a founder-curated legacy host
// list (imagedelivery.net / *.supabase.co / cloudfront / i.ibb.co), not
// arbitrary user input. It reuses apps/api's vetted `isPrivateIp`/`stripBrackets`
// primitives rather than re-deriving the private-range list.
export class SsrfGuardedImageFetcher implements ImageFetcher {
  async fetch(url: string): Promise<Uint8Array> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        return await fetchOnce(url);
      } catch (error) {
        lastError = error;
        if (error instanceof ImageFetchError && error.kind === "ssrf") throw error;
      }
    }
    if (lastError instanceof ImageFetchError) throw lastError;
    throw new ImageFetchError(`fetch failed after ${MAX_RETRIES} attempts`, url, "dead");
  }
}

export interface S3StoreConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

// Real AssetStore: puts objects in the actual S3-API bucket (MinIO in
// docker-compose, R2/S3 in prod) under the same key layout + cache headers
// apps/api's own s3-client.ts uses (08-media.md: immutable, ULID-keyed).
export class S3AssetStore implements AssetStore {
  private readonly client: S3Client;

  constructor(private readonly config: S3StoreConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: true,
    });
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  async has(key: string): Promise<boolean> {
    return (await this.head(key)) !== undefined;
  }

  // Live HeadObject against the real bucket. `verify --live` passes this in
  // place of the checkpoint-rehydrated in-memory store, which is what closes
  // gap G1 in LAUNCH-RUNBOOK.md: the object is proved to exist at the right
  // size in R2, not merely recorded as uploaded in a local checkpoint file.
  async head(key: string): Promise<{ size: number } | undefined> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return { size: result.ContentLength ?? 0 };
    } catch {
      return undefined;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }
}

// Real BeaconValidationSink: writes the SAME `analytics:kyte-map:{username}`
// Redis keys apps/api's resolvePublishedKyteId/refreshKyteMembership read
// (18-migration.md: "bulk-build the Redis beacon-validation set... otherwise
// every migrated profile's analytics silently drop at launch until its first
// republish"). Keys are imported from apps/api rather than re-derived so the
// format can never drift from what the running API actually reads.
export class RedisBeaconSink implements BeaconValidationSink {
  constructor(private readonly redis: Redis) {}

  async add(username: string, kyteId: string): Promise<void> {
    await refreshKyteMembership(this.redis, username, kyteId);
  }

  async size(): Promise<number> {
    let cursor = "0";
    let count = 0;
    do {
      const [next, keys] = await this.redis.scan(cursor, "MATCH", kyteMapKey("*"), "COUNT", 1000);
      cursor = next;
      count += keys.length;
    } while (cursor !== "0");
    return count;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export type RealSeamEnv = {
  AWS_ENDPOINT_URL?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
  REDIS_URL?: string;
};

export class RealAssetSeamConfigError extends Error {}

function requireEnv(env: RealSeamEnv, key: keyof RealSeamEnv): string {
  const value = env[key];
  if (!value) {
    throw new RealAssetSeamConfigError(
      `backfill --execute requires real asset infra: ${key} is not set. ` +
        `Set AWS_ENDPOINT_URL/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_S3_BUCKET + REDIS_URL ` +
        `(docker-compose's MinIO + Redis defaults work), or pass --stub-assets to run the ` +
        `DB-writing logic against fabricated fixture bytes instead of real images.`,
    );
  }
  return value;
}

export type RealSeams = MigrationSeams & {
  store: S3AssetStore;
  beacon: RedisBeaconSink;
  purgeReadCaches(): Promise<number>;
  close(): Promise<void>;
};

export async function purgeReadCaches(redis: Redis): Promise<number> {
  let removed = 0;
  for (const pattern of ["profile:*", "domain:*"]) {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 1000);
      cursor = next;
      if (keys.length > 0) removed += await redis.del(...keys);
    } while (cursor !== "0");
  }
  return removed;
}

export function createRealSeams(env: RealSeamEnv): RealSeams {
  const bucket = requireEnv(env, "AWS_S3_BUCKET");
  const endpoint = requireEnv(env, "AWS_ENDPOINT_URL");
  const accessKeyId = requireEnv(env, "AWS_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv(env, "AWS_SECRET_ACCESS_KEY");
  const redisUrl = requireEnv(env, "REDIS_URL");

  const store = new S3AssetStore({
    endpoint,
    region: env.AWS_REGION ?? "auto",
    accessKeyId,
    secretAccessKey,
    bucket,
  });
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
  const beacon = new RedisBeaconSink(redis);

  return {
    fetcher: new SsrfGuardedImageFetcher(),
    normalize: sharpNormalizeModule,
    store,
    beacon,
    purgeReadCaches: () => purgeReadCaches(redis),
    close: async () => {
      await beacon.close();
    },
  };
}
