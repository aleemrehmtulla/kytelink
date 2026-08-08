import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@kytelink/db";
import { classifyLinkEmoji } from "@kytelink/schemas";
import type { Checkpoint } from "./checkpoint";
import type { LegacySnapshot } from "./legacy-source";
import type { MigrationSeams } from "./seams";
import { ImageFetchError } from "./seams";
import {
  isLegacyAssetUrl,
  mapAccount,
  mapKyteContent,
  personalOrgId,
  personalOrgName,
  planUsernames,
  planUsers,
  sourceMigrationHash,
  type CoercedContent,
  type NewUser,
  type QuarantineEntry,
} from "./mapping";
import type { LegacyKyteRow } from "./legacy-fixture-data";

export type BackfillMode = "full" | "delta";

export type ProgressReporter = (phase: string, done: number, total: number) => void;

const PROGRESS_EVERY = 250;

export const DEFAULT_DB_CONCURRENCY = 16;

export function dbConcurrency(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.BACKFILL_DB_CONCURRENCY ?? DEFAULT_DB_CONCURRENCY);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_DB_CONCURRENCY;
}

export async function mapPooled<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(Math.max(concurrency, 1), items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      if (item === undefined) continue;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export type AssetRecord = {
  url: string;
  kyteId: string;
  kind: "AVATAR" | "LINK_IMAGE";
  status: "ok" | "failed";
  assetId?: string;
  key?: string;
  newUrl?: string;
  contentType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  reason?: string;
};

export type BackfillReport = {
  execute: boolean;
  mode: BackfillMode;
  changed: number;
  legacyCounts: { users: number; accounts: number; drafts: number; prods: number; domains: number };
  users: { migrated: number; quarantined: { userId: string; reason: string }[] };
  usernames: {
    assigned: number;
    nulled: { userId: string; original: string; reason: string }[];
    collisions: { normalized: string; userIds: string[] }[];
  };
  kytes: { total: number; published: number; banned: number };
  organizations: number;
  orgMembers: number;
  domains: number;
  assets: {
    attempted: number;
    succeeded: number;
    skipped: number;
    failed: { url: string; kyteId: string; reason: string }[];
    deadAvatars: string[];
  };
  beaconSetSize: number;
  coercions: string[];
  quarantine: QuarantineEntry[];
};

type UserContext = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  username: string | null;
  draft: LegacyKyteRow | null;
  prod: LegacyKyteRow | null;
  draftContent: CoercedContent | null;
  prodContent: CoercedContent | null;
  sourceHash: string;
};

function assetId(kyteId: string, url: string): string {
  return `asset_${sha256(`${kyteId}:${url}`).slice(0, 24)}`;
}

function assetKey(kyteId: string, kind: "AVATAR" | "LINK_IMAGE", url: string): string {
  const folder = kind === "AVATAR" ? "avatar" : "links";
  const stub = sha256(`${kyteId}:${kind}:${url}`).slice(0, 26);
  return `u/${kyteId}/${folder}/${stub}.webp`;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function dedupeQuarantine(entries: QuarantineEntry[]): QuarantineEntry[] {
  const seen = new Set<string>();
  const out: QuarantineEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.userId}:${entry.field}:${entry.index}:${entry.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

// Rewrites the legacy-asset image URLs embedded in a stored link's `emoji` field
// to their migration outcome: a successfully migrated image becomes its new CDN
// URL; a dead/failed image has its `emoji` key DROPPED entirely (null policy,
// 08-media.md). Dropping is deliberate — writing emoji:"" would be
// present-but-invalid under linkEmojiSchema and make the whole stored row fail
// profileContentSchema, breaking the editor/API that later parse it; an absent
// emoji classifies cleanly as "none". Non-legacy-asset emojis pass through.
export function rewriteAssetEmojis(
  storedLinks: unknown[],
  kyteId: string,
  assetMap: Record<string, AssetRecord>,
): unknown[] {
  return storedLinks.map((link) => {
    if (typeof link !== "object" || link === null) return link;
    const emoji = (link as { emoji?: unknown }).emoji;
    if (typeof emoji !== "string" || !isLegacyAssetUrl(emoji)) return link;
    const record = assetMap[`${kyteId}::${emoji}`];
    const next = { ...(link as Record<string, unknown>) };
    if (record?.status === "ok" && record.newUrl) next.emoji = record.newUrl;
    else delete next.emoji;
    return next;
  });
}

export class Backfill {
  constructor(
    private readonly db: PrismaClient,
    private readonly checkpoint: Checkpoint,
    private readonly seams: MigrationSeams,
    private readonly cdnBaseUrl: string,
    private readonly adminEmails: ReadonlySet<string>,
  ) {}

  private progress: ProgressReporter = () => {};
  private readonly concurrency = dbConcurrency();

  private tick(phase: string, done: number, total: number): void {
    if (done % PROGRESS_EVERY === 0 || done === total) this.progress(phase, done, total);
  }

  async run(
    snapshot: LegacySnapshot,
    execute: boolean,
    options: { crashAfterKytes?: number; mode?: BackfillMode; onProgress?: ProgressReporter } = {},
  ): Promise<BackfillReport> {
    await this.checkpoint.ensure();
    const mode: BackfillMode = options.mode ?? "full";
    this.progress = options.onProgress ?? (() => {});

    const userPlan = planUsers(snapshot.users, this.adminEmails);
    const migratedUserIds = new Set(userPlan.migrate.map((user) => user.id));

    const draftByUser = new Map(snapshot.drafts.map((row) => [row.userId, row]));
    const prodByUser = new Map(snapshot.prods.map((row) => [row.userId, row]));

    const usernameInputs = [...new Set([...draftByUser.keys(), ...prodByUser.keys()])]
      .filter((userId) => migratedUserIds.has(userId))
      .map((userId) => {
        const prod = prodByUser.get(userId);
        const draft = draftByUser.get(userId);
        return { userId, username: prod?.username ?? draft?.username ?? null };
      });
    const usernamePlan = planUsernames(usernameInputs);

    const accountsByUser = new Map<string, ReturnType<typeof mapAccount>[]>();
    for (const account of snapshot.accounts) {
      const mapped = mapAccount(account);
      if (!mapped) continue;
      const list = accountsByUser.get(account.userId) ?? [];
      list.push(mapped);
      accountsByUser.set(account.userId, list);
    }

    const allContexts: UserContext[] = userPlan.migrate
      .map((user) => {
        const draft = draftByUser.get(user.id) ?? null;
        const prod = prodByUser.get(user.id) ?? null;
        if (!draft && !prod) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          username: usernamePlan.assignments.get(user.id) ?? null,
          draft,
          prod,
          draftContent: draft ? mapKyteContent(draft) : null,
          prodContent: prod ? mapKyteContent(prod) : null,
          sourceHash: sourceMigrationHash(user, draft, prod),
        } satisfies UserContext;
      })
      .filter((ctx): ctx is UserContext => ctx !== null);

    const hashMap = await this.checkpoint.readJson<Record<string, string>>("source-hash", {});
    const working =
      mode === "delta"
        ? allContexts.filter((ctx) => hashMap[ctx.id] !== ctx.sourceHash)
        : allContexts;
    const workingIds = new Set(working.map((ctx) => ctx.id));

    const coercions = dedupe(
      allContexts.flatMap((ctx) =>
        [ctx.draftContent, ctx.prodContent]
          .filter((content): content is CoercedContent => content !== null)
          .flatMap((content) => content.coercions.map((entry) => `${ctx.id}:${entry}`)),
      ),
    );
    const quarantine = dedupeQuarantine(
      allContexts.flatMap((ctx) =>
        [ctx.draftContent, ctx.prodContent]
          .filter((content): content is CoercedContent => content !== null)
          .flatMap((content) => content.quarantine),
      ),
    );

    await this.buildBeaconSet(allContexts);

    const workingUsers = userPlan.migrate.filter(
      (user) => mode === "full" || workingIds.has(user.id),
    );
    await this.phaseUsers(workingUsers, accountsByUser, execute, mode === "full");
    await this.phaseKytes(working, execute, mode === "full", options.crashAfterKytes);
    await this.phaseDomains(snapshot, workingIds, migratedUserIds, execute, mode);
    const assetResult = await this.phaseAssets(working, execute);

    if (execute) {
      for (const ctx of working) hashMap[ctx.id] = ctx.sourceHash;
      await this.checkpoint.writeJson("source-hash", hashMap);
    }

    const beaconSetSize = await this.seams.beacon.size();
    const published = allContexts.filter((ctx) => ctx.prod !== null);
    const banned = published.filter((ctx) => ctx.prod?.banned === true);
    const succeeded = assetResult.records.filter((record) => record.status === "ok");
    const failed = assetResult.records.filter((record) => record.status === "failed");

    return {
      execute,
      mode,
      changed: working.length,
      legacyCounts: {
        users: snapshot.users.length,
        accounts: snapshot.accounts.length,
        drafts: snapshot.drafts.length,
        prods: snapshot.prods.length,
        domains: snapshot.domains.length,
      },
      users: { migrated: userPlan.migrate.length, quarantined: userPlan.quarantine },
      usernames: {
        assigned: [...usernamePlan.assignments.values()].filter((value) => value !== null).length,
        nulled: usernamePlan.nulled,
        collisions: usernamePlan.collisions,
      },
      kytes: { total: allContexts.length, published: published.length, banned: banned.length },
      organizations: allContexts.length,
      orgMembers: allContexts.length,
      domains: snapshot.domains.filter((domain) => migratedUserIds.has(domain.userId)).length,
      assets: {
        attempted: assetResult.attempted,
        succeeded: succeeded.length,
        skipped: assetResult.skipped,
        failed: failed.map((record) => ({ url: record.url, kyteId: record.kyteId, reason: record.reason ?? "unknown" })),
        deadAvatars: assetResult.deadAvatars,
      },
      beaconSetSize,
      coercions,
      quarantine,
    };
  }

  private async buildBeaconSet(contexts: UserContext[]): Promise<void> {
    const entries: { username: string; kyteId: string }[] = [];
    const publishable = contexts.filter((ctx) => ctx.prod && ctx.username);
    let done = 0;
    await mapPooled(publishable, this.concurrency, async (ctx) => {
      if (ctx.username) {
        await this.seams.beacon.add(ctx.username, ctx.id);
        entries.push({ username: ctx.username, kyteId: ctx.id });
      }
      done += 1;
      this.tick("beacon", done, publishable.length);
    });
    await this.checkpoint.writeJson("beacon", entries);
  }

  private async phaseUsers(
    users: NewUser[],
    accountsByUser: Map<string, ReturnType<typeof mapAccount>[]>,
    execute: boolean,
    skipViaCheckpoint: boolean,
  ): Promise<void> {
    if (!execute) return;
    const done = skipViaCheckpoint ? await this.checkpoint.loadSet("users") : new Set<string>();
    const pending = users.filter((user) => !done.has(user.id));
    let written = 0;
    await mapPooled(pending, this.concurrency, async (user) => {
      await this.db.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          emailVerified: true,
        },
        update: { email: user.email, name: user.name, image: user.image, role: user.role, emailVerified: true },
      });
      for (const account of accountsByUser.get(user.id) ?? []) {
        if (!account) continue;
        await this.db.account.upsert({
          where: { providerId_accountId: { providerId: account.providerId, accountId: account.accountId } },
          create: {
            id: account.id,
            userId: account.userId,
            providerId: account.providerId,
            accountId: account.accountId,
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
            idToken: account.idToken,
            accessTokenExpiresAt: account.accessTokenExpiresAt,
            scope: account.scope,
          },
          update: {
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
            idToken: account.idToken,
            accessTokenExpiresAt: account.accessTokenExpiresAt,
            scope: account.scope,
          },
        });
      }
      await this.checkpoint.mark("users", user.id);
      written += 1;
      this.tick("users", written, pending.length);
    });
  }

  private async phaseKytes(
    contexts: UserContext[],
    execute: boolean,
    skipViaCheckpoint: boolean,
    crashAfterKytes?: number,
  ): Promise<void> {
    if (!execute) return;
    const done = skipViaCheckpoint ? await this.checkpoint.loadSet("kytes") : new Set<string>();
    const pending = contexts.filter(
      (ctx) => (ctx.draftContent ?? ctx.prodContent) !== null && !done.has(ctx.id),
    );
    let processed = 0;
    const concurrency = crashAfterKytes === undefined ? this.concurrency : 1;
    await mapPooled(pending, concurrency, async (ctx) => {
      const identity = ctx.draftContent ?? ctx.prodContent;
      if (!identity) return;

      const orgId = personalOrgId(ctx.id);
      await this.db.organization.upsert({
        where: { id: orgId },
        create: { id: orgId, name: personalOrgName(ctx.name, ctx.username, ctx.email), personal: true },
        update: { name: personalOrgName(ctx.name, ctx.username, ctx.email), personal: true },
      });
      await this.db.orgMember.upsert({
        where: { orgId_userId: { orgId, userId: ctx.id } },
        create: { orgId, userId: ctx.id, role: "OWNER", kyteAccess: "ALL", invitedById: null },
        update: { role: "OWNER", kyteAccess: "ALL" },
      });

      await this.db.kyte.upsert({
        where: { id: ctx.id },
        create: { id: ctx.id, orgId, ...this.contentColumns(identity, ctx.username) },
        update: { orgId, ...this.contentColumns(identity, ctx.username) },
      });

      if (ctx.prod && ctx.prodContent) {
        const publishedFields = {
          ...this.contentColumns(ctx.prodContent, ctx.username),
          // v1's `banned` boolean has no v2 equivalent — enforcement is only
          // ever suspension now, so a v1 ban lands as SUSPENDED.
          moderationStatus: ctx.prod.banned ? ("SUSPENDED" as const) : ("APPROVED" as const),
          publishSeq: 1,
          publishedById: ctx.id,
          contentHash: sha256(JSON.stringify(ctx.prodContent.content)),
        };
        await this.db.publishedKyte.upsert({
          where: { kyteId: ctx.id },
          create: { kyteId: ctx.id, ...publishedFields },
          update: publishedFields,
        });
      }
      await this.checkpoint.mark("kytes", ctx.id);
      processed += 1;
      this.tick("kytes", processed, pending.length);
      // Resumability test seam: a mid-phase crash must leave a valid checkpoint
      // so a resume run continues without duplicating already-written rows.
      if (crashAfterKytes !== undefined && processed >= crashAfterKytes) {
        throw new Error(`injected crash after ${processed} kytes (resumability test)`);
      }
    });
  }

  private contentColumns(content: CoercedContent, username: string | null) {
    const c = content.content;
    return {
      username,
      displayName: c.displayName,
      description: c.description,
      theme: c.theme,
      customFont: c.customFont,
      customColor: c.customColor,
      seoTitle: c.seoTitle,
      seoDescription: c.seoDescription,
      redirectUrl: c.redirectUrl,
      shouldRedirect: c.shouldRedirect,
      links: json(content.storedLinks),
      icons: json(content.storedIcons),
    };
  }

  private async phaseDomains(
    snapshot: LegacySnapshot,
    workingIds: Set<string>,
    migratedUserIds: Set<string>,
    execute: boolean,
    mode: BackfillMode,
  ): Promise<void> {
    if (!execute) return;
    const done = mode === "full" ? await this.checkpoint.loadSet("domains") : new Set<string>();
    const reaped = await this.checkpoint.loadSet("reaped-domains");
    for (const domain of snapshot.domains) {
      if (!migratedUserIds.has(domain.userId)) continue;
      if (mode === "delta" && !workingIds.has(domain.userId)) continue;
      const normalized = domain.domain.trim().toLowerCase();
      if (done.has(normalized) || reaped.has(normalized)) continue;
      // Migrated as verified: v1 had no verification concept, so every domain in
      // the legacy table was demonstrably serving. Importing them as unverified
      // would take every existing user's custom domain dark at cutover.
      // lastVerifiedAt starts the reaper's 48h clock now, which is the window to
      // register these on the new provider (LAUNCH-RUNBOOK §2) before it releases
      // any that genuinely no longer point at us.
      await this.db.domain.upsert({
        where: { domain: normalized },
        create: {
          domain: normalized,
          kyteId: domain.userId,
          verified: true,
          lastVerifiedAt: new Date(),
        },
        update: { kyteId: domain.userId },
      });
      await this.checkpoint.mark("domains", normalized);
    }
  }

  private async phaseAssets(
    contexts: UserContext[],
    execute: boolean,
  ): Promise<{ records: AssetRecord[]; skipped: number; attempted: number; deadAvatars: string[] }> {
    const map = await this.checkpoint.readJson<Record<string, AssetRecord>>("assets-map", {});
    let skipped = 0;
    const touched: AssetRecord[] = [];

    type Job = { kyteId: string; url: string; kind: "AVATAR" | "LINK_IMAGE" };
    const jobs: Job[] = [];
    const seen = new Set<string>();
    const enqueue = (kyteId: string, url: string, kind: "AVATAR" | "LINK_IMAGE") => {
      const jobKey = `${kyteId}::${url}`;
      if (seen.has(jobKey)) return;
      seen.add(jobKey);
      jobs.push({ kyteId, url, kind });
    };

    for (const ctx of contexts) {
      // Draft and prod may reference DIFFERENT avatars; fetch both so the Kyte
      // and PublishedKyte rows can each keep their own (avatar fidelity is
      // per-row — verify flags a published page that gains the draft's avatar).
      for (const avatarUrl of [ctx.prod?.pfp ?? null, ctx.draft?.pfp ?? null]) {
        if (isLegacyAssetUrl(avatarUrl)) enqueue(ctx.id, avatarUrl, "AVATAR");
      }
      for (const content of [ctx.prodContent, ctx.draftContent]) {
        if (!content) continue;
        for (const link of content.storedLinks) {
          if (typeof link !== "object" || link === null) continue;
          const emoji = (link as { emoji?: unknown }).emoji;
          if (typeof emoji !== "string" || classifyLinkEmoji(emoji) !== "image") continue;
          if (!isLegacyAssetUrl(emoji)) continue;
          enqueue(ctx.id, emoji, "LINK_IMAGE");
        }
      }
    }

    const pending: Job[] = [];
    for (const jobItem of jobs) {
      const existing = map[`${jobItem.kyteId}::${jobItem.url}`];
      if (existing) {
        skipped += 1;
        touched.push(existing);
        continue;
      }
      pending.push(jobItem);
    }

    // Assets are independent of each other, so they run through a worker pool
    // instead of one-at-a-time (the fetch+normalize+upload chain is ~all wall
    // clock). Checkpoint writes are serialized through a promise chain and
    // batched — a crash loses at most the last PERSIST_EVERY records, which the
    // resume run simply re-fetches.
    const concurrency = Math.max(1, Number(process.env.BACKFILL_ASSET_CONCURRENCY ?? 24));
    const PERSIST_EVERY = 25;
    let next = 0;
    let completed = 0;
    let sincePersist = 0;
    let persistChain: Promise<void> = Promise.resolve();
    const persist = () =>
      (persistChain = persistChain.then(() => this.checkpoint.writeJson("assets-map", map)));
    const workers = Array.from({ length: concurrency }, async () => {
      while (next < pending.length) {
        const jobItem = pending[next];
        next += 1;
        if (!jobItem) break;
        const record = await this.processAsset(jobItem.kyteId, jobItem.url, jobItem.kind, execute);
        map[`${jobItem.kyteId}::${jobItem.url}`] = record;
        touched.push(record);
        completed += 1;
        this.tick("assets", completed, pending.length);
        sincePersist += 1;
        if (sincePersist >= PERSIST_EVERY) {
          sincePersist = 0;
          void persist();
        }
      }
    });
    await Promise.all(workers);
    await persist();

    if (execute) await this.applyAssetRewrites(contexts, map);

    const deadAvatars = touched
      .filter((record) => record.kind === "AVATAR" && record.status === "failed")
      .map((record) => record.kyteId);

    return { records: touched, skipped, attempted: jobs.length, deadAvatars };
  }

  private async processAsset(
    kyteId: string,
    url: string,
    kind: "AVATAR" | "LINK_IMAGE",
    execute: boolean,
  ): Promise<AssetRecord> {
    try {
      const bytes = await this.seams.fetcher.fetch(url);
      const normalized = await this.seams.normalize.normalizeImage(
        bytes,
        kind === "AVATAR" ? "avatar" : "link_image",
      );
      const key = assetKey(kyteId, kind, url);
      const lqipKey = key.replace(/\.webp$/, ".lqip.webp");
      const id = assetId(kyteId, url);
      if (execute) {
        await this.seams.store.put(key, normalized.main.buffer, normalized.main.contentType);
        await this.seams.store.put(lqipKey, normalized.lqip.buffer, normalized.lqip.contentType);
        await this.db.asset.upsert({
          where: { id },
          create: {
            id,
            kyteId,
            uploadedById: kyteId,
            key,
            kind,
            contentType: normalized.main.contentType,
            sizeBytes: normalized.main.sizeBytes,
            width: normalized.main.width,
            height: normalized.main.height,
          },
          update: {
            key,
            contentType: normalized.main.contentType,
            sizeBytes: normalized.main.sizeBytes,
            width: normalized.main.width,
            height: normalized.main.height,
          },
        });
      }
      return {
        url,
        kyteId,
        kind,
        status: "ok",
        assetId: id,
        key,
        newUrl: `${this.cdnBaseUrl}/${key}`,
        contentType: normalized.main.contentType,
        sizeBytes: normalized.main.sizeBytes,
        width: normalized.main.width,
        height: normalized.main.height,
      };
    } catch (error) {
      const reason = error instanceof ImageFetchError ? `${error.kind}:${error.message}` : String(error);
      return { url, kyteId, kind, status: "failed", reason };
    }
  }

  private async applyAssetRewrites(
    contexts: UserContext[],
    map: Record<string, AssetRecord>,
  ): Promise<void> {
    let rewritten = 0;
    await mapPooled(contexts, this.concurrency, async (ctx) => {
      rewritten += 1;
      this.tick("rewrites", rewritten, contexts.length);
      const resolveAvatar = (avatarUrl: string | null | undefined): string | null => {
        if (!isLegacyAssetUrl(avatarUrl)) return null;
        const record = map[`${ctx.id}::${avatarUrl}`];
        return record?.status === "ok" ? record.assetId ?? null : null;
      };

      const identity = ctx.draftContent ?? ctx.prodContent;
      if (identity) {
        const kyteAvatarUrl = ctx.draft ? ctx.draft.pfp : ctx.prod?.pfp;
        await this.db.kyte.update({
          where: { id: ctx.id },
          data: {
            avatarAssetId: resolveAvatar(kyteAvatarUrl),
            links: json(rewriteAssetEmojis(identity.storedLinks, ctx.id, map)),
          },
        });
      }
      if (ctx.prod && ctx.prodContent) {
        await this.db.publishedKyte.update({
          where: { kyteId: ctx.id },
          data: {
            avatarAssetId: resolveAvatar(ctx.prod.pfp),
            links: json(rewriteAssetEmojis(ctx.prodContent.storedLinks, ctx.id, map)),
          },
        });
      }
    });
  }
}
