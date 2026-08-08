import type { Logger } from "pino";
import { getDb, type Prisma } from "@kytelink/db";
import type { ModerationStatus, ModerationVerdict } from "@kytelink/schemas";
import { iconSchema, linkSchema } from "@kytelink/schemas";
import { getEmailProvider, kyteSuspendedSubject, renderKyteSuspendedEmail } from "@kytelink/emails";
import { getCdnUrl } from "@kytelink/cdn";
import { appealUrl } from "./appeal-copy";
import { ASSET_QUARANTINE_QUEUE_NAME, enqueueCrossWorkerJob, REVALIDATE_QUEUE_NAME } from "./queue-bridge";
import type {
  ModerationKyteSnapshot,
  ModerationReviewInput,
  ModerationStore,
  SetModerationStatusResult,
} from "./types";

function parseLinks(raw: unknown): ModerationKyteSnapshot["links"] {
  const parsed = linkSchema.array().safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.map((link) => ({ title: link.title, url: link.link }));
}

function parseIcons(raw: unknown): ModerationKyteSnapshot["icons"] {
  const parsed = iconSchema.array().safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.map((icon) => ({ url: icon.url ?? null }));
}

function emailDomainOf(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export function createPrismaModerationStore(log: Logger): ModerationStore {
  const db = getDb();

  async function resolveAvatarAndOrg(
    kyteId: string,
    avatarAssetId: string | null,
  ): Promise<{ orgId: string; avatarUrl: string | null }> {
    const kyte = await db.kyte.findUnique({ where: { id: kyteId }, select: { orgId: true } });
    const orgId = kyte?.orgId ?? "";
    if (!avatarAssetId) return { orgId, avatarUrl: null };
    const asset = await db.asset.findUnique({ where: { id: avatarAssetId }, select: { key: true } });
    return { orgId, avatarUrl: asset ? getCdnUrl(asset.key) : null };
  }

  async function resolveOwnerEmailDomain(orgId: string): Promise<string | null> {
    if (!orgId) return null;
    const owner = await db.orgMember.findFirst({
      where: { orgId, role: "OWNER" },
      include: { user: { select: { email: true } } },
    });
    return owner ? emailDomainOf(owner.user.email) : null;
  }

  return {
    async loadKyteForReview(kyteId: string): Promise<ModerationKyteSnapshot | null> {
      const published = await db.publishedKyte.findUnique({ where: { kyteId } });
      if (!published) return null;

      const { orgId, avatarUrl } = await resolveAvatarAndOrg(kyteId, published.avatarAssetId);
      const ownerEmailDomain = await resolveOwnerEmailDomain(orgId);

      return {
        kyteId,
        orgId,
        username: published.username,
        displayName: published.displayName,
        description: published.description,
        links: parseLinks(published.links),
        icons: parseIcons(published.icons),
        avatarAssetId: published.avatarAssetId,
        avatarUrl,
        redirectUrl: published.shouldRedirect ? published.redirectUrl : null,
        ownerEmailDomain,
        publishSeq: published.publishSeq,
        moderationStatus: published.moderationStatus,
        contentHash: published.contentHash,
      };
    },

    async saveContentHash(kyteId: string, contentHash: string): Promise<void> {
      await db.publishedKyte.update({ where: { kyteId }, data: { contentHash } });
    },

    async findReviewByHash(
      kyteId: string,
      contentHash: string,
    ): Promise<{ verdict: ModerationVerdict } | null> {
      const review = await db.moderationReview.findFirst({
        where: { kyteId, contentHash },
        orderBy: { createdAt: "desc" },
        select: { verdict: true },
      });
      return review ? { verdict: review.verdict } : null;
    },

    async writeReview(review: ModerationReviewInput): Promise<void> {
      await db.moderationReview.create({
        data: {
          kyteId: review.kyteId,
          contentHash: review.contentHash,
          verdict: review.verdict,
          categories: review.categories,
          reason: review.reason,
          provider: review.provider,
          confidence: review.confidence,
          signals: review.signals as unknown as Prisma.InputJsonValue,
          reviewedBy: review.reviewedBy,
        },
      });
    },

    async setModerationStatus(
      kyteId: string,
      status: ModerationStatus,
      opts: { ifPublishSeqAtMost: number },
    ): Promise<SetModerationStatusResult> {
      const updated = await db.publishedKyte.updateMany({
        where: { kyteId, publishSeq: opts.ifPublishSeqAtMost },
        data: { moderationStatus: status },
      });
      if (updated.count > 0) {
        return { applied: true, currentPublishSeq: opts.ifPublishSeqAtMost };
      }
      const current = await db.publishedKyte.findUnique({ where: { kyteId }, select: { publishSeq: true } });
      return { applied: false, currentPublishSeq: current?.publishSeq ?? opts.ifPublishSeqAtMost };
    },

    async forceSetModerationStatus(kyteId: string, status: ModerationStatus): Promise<void> {
      await db.publishedKyte.update({ where: { kyteId }, data: { moderationStatus: status } });
    },

    async quarantineAssets(kyteId: string): Promise<void> {
      await enqueueCrossWorkerJob(ASSET_QUARANTINE_QUEUE_NAME, "quarantine", { kyteId }, log);
    },

    async unquarantineAssets(kyteId: string): Promise<void> {
      await enqueueCrossWorkerJob(ASSET_QUARANTINE_QUEUE_NAME, "unquarantine", { kyteId }, log);
    },

    async requestRevalidate(kyteId: string, username: string | null): Promise<void> {
      await enqueueCrossWorkerJob(REVALIDATE_QUEUE_NAME, "revalidate", { kyteId, username }, log);
    },

    async notifySuspendedOwners(
      kyteId: string,
      username: string | null,
      reason: string,
    ): Promise<void> {
      const kyte = await db.kyte.findUnique({ where: { id: kyteId }, select: { orgId: true } });
      if (!kyte) return;
      const owners = await db.orgMember.findMany({
        where: { orgId: kyte.orgId, role: "OWNER" },
        include: { user: { select: { email: true } } },
      });
      const provider = getEmailProvider();
      const kyteUsername = username ?? kyteId;
      const rendered = await renderKyteSuspendedEmail({
        kyteUsername,
        reason,
        appealUrl: appealUrl({ kind: "kyte", handle: username }),
      });
      for (const owner of owners) {
        await provider.sendEmail({
          to: owner.user.email,
          subject: kyteSuspendedSubject(kyteUsername),
          html: rendered.html,
          text: rendered.text,
        });
      }
    },

    async adminAlert(kind: string, message: string, meta?: Record<string, unknown>): Promise<void> {
      await db.adminAlert.create({
        data: { kind, message, meta: meta as unknown as Prisma.InputJsonValue | undefined },
      });
    },

    async listAllPublishedForSweep(): Promise<ModerationKyteSnapshot[]> {
      const rows = await db.publishedKyte.findMany();
      const snapshots: ModerationKyteSnapshot[] = [];
      for (const published of rows) {
        const { orgId, avatarUrl } = await resolveAvatarAndOrg(published.kyteId, published.avatarAssetId);
        const ownerEmailDomain = await resolveOwnerEmailDomain(orgId);
        snapshots.push({
          kyteId: published.kyteId,
          orgId,
          username: published.username,
          displayName: published.displayName,
          description: published.description,
          links: parseLinks(published.links),
          icons: parseIcons(published.icons),
          avatarAssetId: published.avatarAssetId,
          avatarUrl,
          redirectUrl: published.shouldRedirect ? published.redirectUrl : null,
          ownerEmailDomain,
          publishSeq: published.publishSeq,
          moderationStatus: published.moderationStatus,
          contentHash: published.contentHash,
        });
      }
      return snapshots;
    },
  };
}
