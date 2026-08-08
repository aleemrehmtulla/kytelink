import { randomBytes, randomInt } from "node:crypto";
import {
  PREVIEW_EXPIRY_DAYS,
  PREVIEW_TOKEN_BYTES,
  previewLinkSchema,
  previewUrl,
  type PreviewLink,
} from "@kytelink/schemas";
import { router } from "@kytelink/trpc";
import { kyte } from "../trpc/procedures";
import { assertCan } from "../trpc/permissions";
import { enforceRateLimit, isRedisLike, RedisRateLimiter } from "../trpc/rate-limit";
import type { PreviewRow } from "../store/store";
import { kyteIdInput } from "./shapes";

function newToken(): string {
  return randomBytes(PREVIEW_TOKEN_BYTES).toString("base64url");
}

function newPasscode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function newExpiry(): Date {
  return new Date(Date.now() + PREVIEW_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

function toLink(row: PreviewRow, webBaseUrl: string): PreviewLink {
  return {
    token: row.token,
    passcode: row.passcode,
    url: previewUrl(webBaseUrl, row.token),
    expiresAt: row.expiresAt,
  };
}

export const previewRouter = router({
  ensure: kyte
    .input(kyteIdInput)
    .output(previewLinkSchema)
    .mutation(async ({ ctx }) => {
      assertCan(ctx.access.effectiveRole, "create_preview_link");
      const k = ctx.access.kyte!;
      const existing = await ctx.store.getPreviewForKyte(k.id);
      if (!existing) {
        const created = await ctx.store.createPreview({
          kyteId: k.id,
          token: newToken(),
          passcode: newPasscode(),
          createdById: ctx.user.id,
          actorUserId: ctx.user.id,
          expiresAt: newExpiry(),
        });
        return toLink(created, ctx.config.webBaseUrl);
      }
      // A lapsed link is re-issued in place rather than left dead: the owner
      // never has to "generate" one, and the stale passcode stops working.
      if (existing.expiresAt.getTime() <= Date.now()) {
        const rotated = await ctx.store.rotatePreviewPasscode({
          kyteId: k.id,
          passcode: newPasscode(),
          expiresAt: newExpiry(),
          actorUserId: ctx.user.id,
        });
        return toLink(rotated, ctx.config.webBaseUrl);
      }
      return toLink(existing, ctx.config.webBaseUrl);
    }),

  rotate: kyte
    .input(kyteIdInput)
    .output(previewLinkSchema)
    .mutation(async ({ ctx }) => {
      assertCan(ctx.access.effectiveRole, "create_preview_link");
      const k = ctx.access.kyte!;
      if (isRedisLike(ctx.redis)) {
        await enforceRateLimit(
          new RedisRateLimiter(ctx.redis),
          "preview-rotate",
          { user: ctx.user.id },
          { failOpen: false },
        );
      }
      const existing = await ctx.store.getPreviewForKyte(k.id);
      const row = existing
        ? await ctx.store.rotatePreviewPasscode({
            kyteId: k.id,
            passcode: newPasscode(),
            expiresAt: newExpiry(),
            actorUserId: ctx.user.id,
          })
        : await ctx.store.createPreview({
            kyteId: k.id,
            token: newToken(),
            passcode: newPasscode(),
            createdById: ctx.user.id,
            actorUserId: ctx.user.id,
            expiresAt: newExpiry(),
          });
      return toLink(row, ctx.config.webBaseUrl);
    }),
});
