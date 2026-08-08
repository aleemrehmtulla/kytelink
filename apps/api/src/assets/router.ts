import { ulid } from "ulid";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  assetKindSchema,
  isKyteEffectivelySuspended,
  LIMIT_DEFAULTS,
  resolveLimit,
} from "@kytelink/schemas";
import { featureDisabled, kyteSuspended, limitReached, router } from "@kytelink/trpc";
import { authed, kyte } from "../trpc/procedures";
import { assertCan, resolveKyteAccess } from "../trpc/permissions";
import { suspendedKyteMessage, suspendedOrgMessage } from "../moderation/appeal-copy";
import type { KyteAccessContext } from "../trpc/context-ext";
import type { Store } from "../store/store";
import { enforceRateLimit, isRedisLike, RedisRateLimiter } from "../trpc/rate-limit";
import { okSchema } from "../routers/shapes";
import { getCdnUrl, getLqipUrl } from "@kytelink/cdn";
import { buildAssetKey, buildLqipKey, buildRawUploadKey } from "./keys";
import { createPresignedPutUrl, deleteObject, getObjectBuffer, headObject, putObject } from "./s3-client";
import { imageProcessQueue } from "./image-process-queue";
import { sharpNormalizeModule, type NormalizeKind } from "./sharp-normalize";
import { repositoryFor, type AssetRow } from "./repository";

const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const UPLOADABLE_KINDS = new Set(["AVATAR", "LINK_IMAGE"]);

function assetUrl(key: string): { url: string; lqip: string } {
  return { url: getCdnUrl(key), lqip: getLqipUrl(key) };
}

// These two run on `authed`, not `kyte`, so they resolve access themselves and
// have to repeat the effective-suspension gate the kyte chain applies.
async function assertNotSuspended(store: Store, access: KyteAccessContext): Promise<void> {
  if (access.org.suspendedAt !== null) {
    throw kyteSuspended(suspendedOrgMessage(access.org.suspensionReason, access.org.id));
  }
  if (
    access.kyte &&
    isKyteEffectivelySuspended({
      moderationStatus: access.kyte.moderationStatus,
      orgSuspendedAt: access.org.suspendedAt,
    })
  ) {
    throw kyteSuspended(
      suspendedKyteMessage(await store.latestModerationReason(access.kyte.id), access.kyte.username),
    );
  }
}

export const assetsRouter = router({
  createUploadUrl: kyte
    .input(
      z.object({
        kyteId: z.string().min(1),
        kind: assetKindSchema,
        contentType: z.string().min(1),
        sizeBytes: z.number().int().positive(),
      }),
    )
    .output(
      z.object({
        assetId: z.string(),
        uploadUrl: z.string(),
        fields: z.record(z.string(), z.string()).nullable(),
        key: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.config.capabilities.uploads) throw featureDisabled();
      assertCan(ctx.access.effectiveRole, "upload_asset");

      if (!UPLOADABLE_KINDS.has(input.kind)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "OG images are generated server-side and cannot be uploaded directly.",
        });
      }
      if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unsupported content type: ${input.contentType}` });
      }
      const uploadMax = resolveLimit(
        LIMIT_DEFAULTS.uploadMaxBytes,
        ctx.access.org.limitOverrides.uploadMaxBytes,
      );
      if (input.sizeBytes > uploadMax) {
        throw limitReached(`Uploads are capped at ${uploadMax} bytes.`);
      }
      if (isRedisLike(ctx.redis)) {
        await enforceRateLimit(
          new RedisRateLimiter(ctx.redis),
          "upload-url",
          { user: ctx.user.id },
          { failOpen: false },
        );
      }

      const org = ctx.access.org;
      const repo = repositoryFor(ctx.store);
      const used = await repo.sumSizeBytesForOrg(org.id);
      const limit = resolveLimit(LIMIT_DEFAULTS.storageBytesPerOrg, org.limitOverrides.storageBytesPerOrg);
      if (used + input.sizeBytes > limit) {
        throw limitReached(`Limit reached for storageBytesPerOrg (${limit} bytes).`);
      }

      const assetId = ulid();
      const rawKey = buildRawUploadKey(input.kyteId, assetId);
      const uploadUrl = await createPresignedPutUrl(rawKey, input.contentType);

      repo.createPendingUpload({
        assetId,
        kyteId: input.kyteId,
        uploadedById: ctx.user.id,
        kind: input.kind as "AVATAR" | "LINK_IMAGE",
        contentType: input.contentType,
        declaredSizeBytes: input.sizeBytes,
        rawKey,
        createdAt: new Date(),
      });

      return { assetId, uploadUrl, fields: null, key: rawKey };
    }),

  finalize: authed
    .input(z.object({ assetId: z.string().min(1) }))
    .output(z.object({ url: z.string(), lqip: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.config.capabilities.uploads) throw featureDisabled();

      const repo = repositoryFor(ctx.store);
      const pending = repo.peekPendingUpload(input.assetId);
      if (!pending) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No pending upload for this asset." });
      }

      const access = await resolveKyteAccess(ctx.store, ctx.user, { kyteId: pending.kyteId });
      assertCan(access.effectiveRole, "upload_asset");
      await assertNotSuspended(ctx.store, access);

      repo.takePendingUpload(input.assetId);

      const finalKey = buildAssetKey(pending.kyteId, pending.kind, ulid(), "webp");
      const lqipKey = buildLqipKey(finalKey);

      const normalized = await imageProcessQueue.run(async () => {
        const head = await headObject(pending.rawKey);
        // Re-resolved here rather than trusted from the pre-sign step: the cap
        // can change between requesting the URL and the object landing.
        const objectMax = resolveLimit(
          LIMIT_DEFAULTS.uploadMaxBytes,
          access.org.limitOverrides.uploadMaxBytes,
        );
        if (head.sizeBytes > objectMax) {
          await deleteObject(pending.rawKey).catch(() => undefined);
          throw limitReached(`Uploaded object exceeds the ${objectMax} byte cap.`);
        }

        const raw = await getObjectBuffer(pending.rawKey);
        const normalizeKind: NormalizeKind = pending.kind === "AVATAR" ? "avatar" : "link_image";

        let result;
        try {
          result = await sharpNormalizeModule.normalizeImage(raw, normalizeKind);
        } catch (error) {
          await deleteObject(pending.rawKey).catch(() => undefined);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Uploaded file is not a valid image.",
            cause: error,
          });
        }

        await putObject(finalKey, result.main.buffer, result.main.contentType);
        await putObject(lqipKey, result.lqip.buffer, result.lqip.contentType);
        await deleteObject(pending.rawKey).catch(() => undefined);

        return result;
      });

      const assetRow: AssetRow = {
        id: input.assetId,
        kyteId: pending.kyteId,
        uploadedById: pending.uploadedById,
        key: finalKey,
        kind: pending.kind,
        contentType: normalized.main.contentType,
        sizeBytes: normalized.main.sizeBytes,
        width: normalized.main.width,
        height: normalized.main.height,
        createdAt: new Date(),
      };
      await repo.insertAsset(assetRow);

      const { url, lqip } = assetUrl(finalKey);

      if (pending.kind === "AVATAR" && access.kyte) {
        await ctx.store.updateDraft(access.kyte.id, { ...access.kyte.draft, avatar: { url, lqip } });
      }

      return { url, lqip };
    }),

  delete: authed
    .input(z.object({ assetId: z.string().min(1) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.config.capabilities.uploads) throw featureDisabled();

      const repo = repositoryFor(ctx.store);
      const asset = await repo.getAsset(input.assetId);
      if (!asset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found." });
      }

      const access = await resolveKyteAccess(ctx.store, ctx.user, { kyteId: asset.kyteId });
      assertCan(access.effectiveRole, "upload_asset");
      await assertNotSuspended(ctx.store, access);

      await deleteObject(asset.key).catch(() => undefined);
      await deleteObject(buildLqipKey(asset.key)).catch(() => undefined);
      await repo.removeAsset(input.assetId);

      const { url } = assetUrl(asset.key);
      if (access.kyte && asset.kind === "AVATAR" && access.kyte.draft.avatar?.url === url) {
        await ctx.store.updateDraft(access.kyte.id, { ...access.kyte.draft, avatar: null });
      }

      return { ok: true } as const;
    }),
});
