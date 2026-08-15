import { createHash, timingSafeEqual } from "node:crypto";
import {
  DIRECTORY_PAGE_SIZE,
  hostsIncludeRedirectTarget,
  isKyteEffectivelySuspended,
  type DirectoryPage,
  type ModerationStatus,
  type ProfileContent,
} from "@kytelink/schemas";
import { getDb, type Prisma } from "@kytelink/db";
import { getCdnUrl, getLqipUrl } from "@kytelink/cdn";
import { getRedis } from "../redis";
import { columnsToContent } from "../store/content-mapping";

const PROFILE_TTL = 300;
const PROFILE_MISS_TTL = 60;
const DOMAIN_HIT_TTL = 300;
const DOMAIN_MISS_TTL = 60;
const TOMBSTONE = "NONE";

export interface ProfilePayload {
  username: string;
  kyteId: string;
  content: ProfileContent;
  publishSeq: number;
  // EFFECTIVE status: SUSPENDED whenever the kyte itself is suspended *or* its
  // organization is, so a renderer never has to know the difference.
  moderationStatus: ModerationStatus;
  suspensionReason: string | null;
  ogImageUrl: string | null;
}

// ProfileContent.avatar is a projection of the avatarAssetId column + its
// Asset row (profile-content.ts) — stored rows never carry the URL themselves.
async function resolveAvatar(avatarAssetId: string | null): Promise<ProfileContent["avatar"]> {
  if (!avatarAssetId) return null;
  const asset = await getDb().asset.findUnique({
    where: { id: avatarAssetId },
    select: { key: true },
  });
  if (!asset) return null;
  return { url: getCdnUrl(asset.key), lqip: getLqipUrl(asset.key) };
}

// The kyte's own verdict wins: it is the most specific thing recorded about
// this page. An org suspension (including one cascaded from its owner's) is the
// fallback, so a page is never taken down with no explanation attached.
async function suspensionReasonOf(
  kyteId: string,
  org: { suspensionReason: string | null },
): Promise<string | null> {
  const review = await getDb().moderationReview.findFirst({
    where: { kyteId, verdict: "SUSPEND" },
    orderBy: { createdAt: "desc" },
    select: { reason: true },
  });
  return review?.reason ?? org.suspensionReason;
}

// Heals loops published before the publish-time gate existed: a redirect to the
// kyte's own custom domain would bounce through the middleware rewrite forever.
async function redirectsToOwnDomain(kyteId: string, content: ProfileContent): Promise<boolean> {
  if (!content.shouldRedirect || !content.redirectUrl) return false;
  const domains = await getDb().domain.findMany({ where: { kyteId }, select: { domain: true } });
  return hostsIncludeRedirectTarget(domains.map((d) => d.domain), content.redirectUrl);
}

export async function resolveProfile(username: string): Promise<ProfilePayload | null> {
  const key = `profile:${username}`;
  const redis = getRedis();
  const cached = await redis.get(key);
  if (cached === TOMBSTONE) return null;
  if (cached) return JSON.parse(cached) as ProfilePayload;

  const pub = await getDb().publishedKyte.findUnique({
    where: { username },
    include: {
      kyte: {
        select: {
          organization: { select: { suspendedAt: true, suspensionReason: true } },
        },
      },
    },
  });
  if (!pub) {
    await redis.set(key, TOMBSTONE, "EX", PROFILE_MISS_TTL);
    return null;
  }
  const ogAsset = await getDb().asset.findFirst({
    where: { kyteId: pub.kyteId, kind: "OG_IMAGE" },
    orderBy: { createdAt: "desc" },
  });
  const org = pub.kyte.organization;
  const suspended = isKyteEffectivelySuspended({
    moderationStatus: pub.moderationStatus,
    orgSuspendedAt: org.suspendedAt,
  });
  const content: ProfileContent = {
    ...columnsToContent(pub),
    avatar: await resolveAvatar(pub.avatarAssetId),
  };
  if (await redirectsToOwnDomain(pub.kyteId, content)) {
    content.shouldRedirect = false;
  }
  const payload: ProfilePayload = {
    username,
    kyteId: pub.kyteId,
    content,
    publishSeq: pub.publishSeq,
    moderationStatus: suspended ? "SUSPENDED" : "APPROVED",
    suspensionReason: suspended ? await suspensionReasonOf(pub.kyteId, org) : null,
    ogImageUrl: ogAsset ? getCdnUrl(ogAsset.key) : null,
  };
  await redis.set(key, JSON.stringify(payload), "EX", PROFILE_TTL);
  return payload;
}

// Shared by the sitemap worker and the /discover directory so neither can ever
// surface a page the other would refuse: approved, not suspended (own or org),
// not a 307 redirect stub, and not opted out of listing. The opt-out has to drop
// both at once — a directory entry the sitemap omits is an orphan-page audit error.
export function listableKyteWhere(): Prisma.PublishedKyteWhereInput {
  return {
    moderationStatus: "APPROVED",
    shouldRedirect: false,
    hideFromDiscover: false,
    username: { not: null },
    kyte: { organization: { suspendedAt: null } },
  };
}

// PublishedKyte.avatarAssetId is a plain column, not a Prisma relation, so a page's
// avatars cannot be joined into the findMany — one batched `id IN (...)` lookup
// resolves them all instead, never one query per row.
async function avatarKeysById(assetIds: string[]): Promise<Map<string, string>> {
  if (assetIds.length === 0) return new Map();
  const assets = await getDb().asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, key: true },
  });
  return new Map(assets.map((asset) => [asset.id, asset.key]));
}

export async function listDirectory(page: number): Promise<DirectoryPage> {
  const db = getDb();
  const where = listableKyteWhere();
  const total = await db.publishedKyte.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));

  const rows =
    page > pageCount
      ? []
      : await db.publishedKyte.findMany({
          where,
          select: { username: true, displayName: true, avatarAssetId: true },
          orderBy: [{ directoryPriority: "desc" }, { username: "asc" }],
          skip: (page - 1) * DIRECTORY_PAGE_SIZE,
          take: DIRECTORY_PAGE_SIZE,
        });

  const keys = await avatarKeysById(
    rows.flatMap((row) => (row.avatarAssetId ? [row.avatarAssetId] : [])),
  );

  return {
    entries: rows.flatMap((row) => {
      if (!row.username) return [];
      const key = row.avatarAssetId ? keys.get(row.avatarAssetId) ?? null : null;
      return [
        {
          username: row.username,
          displayName: row.displayName,
          avatarUrl: key ? getCdnUrl(key) : null,
          lqipUrl: key ? getLqipUrl(key) : null,
        },
      ];
    }),
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
    total,
    pageCount,
  };
}

export async function resolveDomain(host: string): Promise<string | null> {
  const normalized = host.trim().toLowerCase();
  const key = `domain:${normalized}`;
  const redis = getRedis();
  const cached = await redis.get(key);
  if (cached === TOMBSTONE) return null;
  if (cached) return cached;

  // Adding an apex domain registers `www.` alongside it at the provider, but
  // stores one row for the host the user typed. Falling back to the apex lets
  // both spellings serve without a second row to keep in sync (or to reap).
  const candidates = normalized.startsWith("www.")
    ? [normalized, normalized.slice(4)]
    : [normalized];

  for (const candidate of candidates) {
    const domain = await getDb().domain.findUnique({
      where: { domain: candidate },
      include: { kyte: true },
    });
    const username = domain?.verified ? domain.kyte.username : null;
    if (username) {
      await redis.set(key, username, "EX", DOMAIN_HIT_TTL);
      return username;
    }
  }

  await redis.set(key, TOMBSTONE, "EX", DOMAIN_MISS_TTL);
  return null;
}

/**
 * Cert-issuance gate for a self-hosted reverse proxy's on-demand TLS (Caddy's
 * `ask`). Deliberately narrower than resolveDomain: it answers only "may this
 * host get a certificate", never who owns it.
 */
export async function isDomainAllowed(host: string): Promise<boolean> {
  return (await resolveDomain(host)) !== null;
}

export interface PreviewResolution {
  ok: boolean;
  content?: ProfileContent;
  username?: string | null;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Compare digests, not the raw values: equal-length buffers keep timingSafeEqual
// from throwing and stop a wrong-length guess from being distinguishable.
function secretsEqual(a: string, b: string): boolean {
  return timingSafeEqual(Buffer.from(hash(a), "utf8"), Buffer.from(hash(b), "utf8"));
}

export async function resolvePreview(token: string, passcode: string): Promise<PreviewResolution> {
  const preview = await getDb().previewLink.findUnique({
    where: { token },
    include: { kyte: true },
  });
  if (!preview || preview.expiresAt.getTime() < Date.now()) {
    return { ok: false };
  }
  if (!secretsEqual(preview.passcode, passcode)) {
    return { ok: false };
  }
  return {
    ok: true,
    content: {
      ...columnsToContent(preview.kyte),
      avatar: await resolveAvatar(preview.kyte.avatarAssetId),
    },
    username: preview.kyte.username,
  };
}
