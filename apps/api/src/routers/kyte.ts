import { z } from "zod";
import {
  isKyteEffectivelySuspended,
  moderationStatusSchema,
  profileContentSchema,
  roleSchema,
  usernameSchema,
  validateUsername,
} from "@kytelink/schemas";
import { router, staleDraft } from "@kytelink/trpc";
import { TRPCError } from "@trpc/server";
import { authed, kyte } from "../trpc/procedures";
import { assertCan, resolveKyteAccess } from "../trpc/permissions";
import { assertCountLimit } from "../trpc/limits";
import { afterPublish, afterUsernameChange } from "../publish-hooks";
import { enqueueSitemapRefresh } from "../workers/queues";
import { trackProductEvent } from "../seams/analytics-seam";
import { assertRedirectDoesNotLoop } from "../trpc/redirect-loop";
import { kyteIdInput, okSchema } from "./shapes";

const scheduleSummarySchema = z.object({
  id: z.string(),
  scheduledFor: z.string(),
  timezone: z.string(),
  status: z.string(),
});

const kyteGetOutput = z.object({
  id: z.string(),
  orgId: z.string(),
  username: z.string().nullable(),
  role: roleSchema,
  moderationStatus: moderationStatusSchema,
  suspensionReason: z.string().nullable(),
  published: z.boolean(),
  updatedAt: z.string(),
  draft: profileContentSchema,
  publishedContent: profileContentSchema.nullable(),
  schedules: z.array(scheduleSummarySchema),
});

export const kyteRouter = router({
  get: kyte
    .input(kyteIdInput)
    .output(kyteGetOutput)
    .query(async ({ ctx }) => {
      const role = assertCan(ctx.access.effectiveRole, "view_editor");
      const k = ctx.access.kyte!;
      const schedules = (await ctx.store.listSchedules(k.id)).map((s) => ({
        id: s.id,
        scheduledFor: s.scheduledFor.toISOString(),
        timezone: s.timezone,
        status: s.status,
      }));
      const suspended = isKyteEffectivelySuspended({
        moderationStatus: k.moderationStatus,
        orgSuspendedAt: ctx.access.org.suspendedAt,
      });
      return {
        id: k.id,
        orgId: k.orgId,
        username: k.username,
        role,
        moderationStatus: suspended ? "SUSPENDED" : k.moderationStatus,
        suspensionReason: suspended
          ? ((await ctx.store.latestModerationReason(k.id)) ?? ctx.access.org.suspensionReason)
          : null,
        published: k.published !== null,
        updatedAt: k.updatedAt.toISOString(),
        draft: k.draft,
        publishedContent: k.published,
        schedules,
      };
    }),

  create: authed
    .input(z.object({ orgId: z.string().min(1).optional(), username: usernameSchema }))
    .output(z.object({ kyteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      let orgId = input.orgId;
      if (!orgId) {
        const memberships = await ctx.store.membershipsForUser(ctx.user.id);
        for (const m of memberships) {
          const org = await ctx.store.orgById(m.orgId);
          if (org?.personal) {
            orgId = org.id;
            break;
          }
        }
      }
      if (!orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No organization available." });
      }
      const access = await resolveKyteAccess(ctx.store, ctx.user, { orgId });
      assertCan(access.orgMember.role, "create_kyte");
      const current = await ctx.store.countKytesByOrg(orgId);
      assertCountLimit(current, access.org, "kytesPerOrg");
      const owner = await ctx.store.usernameOwner(input.username);
      if (owner) {
        throw new TRPCError({ code: "CONFLICT", message: "Username already taken." });
      }
      const { kyteId } = await ctx.store.createKyte({ orgId, actorUserId: ctx.user.id });
      await ctx.store.changeUsername({ kyteId, actorUserId: ctx.user.id, username: input.username });
      await afterUsernameChange(kyteId, null, input.username);
      trackProductEvent({ event: "kyte_created", userId: ctx.user.id, kyteId });
      return { kyteId };
    }),

  updateDraft: kyte
    .input(
      z.object({
        kyteId: z.string().min(1),
        content: profileContentSchema,
        baseUpdatedAt: z.coerce.date(),
      }),
    )
    .output(z.object({ updatedAt: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "edit_draft");
      const k = ctx.access.kyte!;
      if (input.baseUpdatedAt.getTime() < k.updatedAt.getTime()) {
        throw staleDraft();
      }
      const { updatedAt } = await ctx.store.updateDraft(k.id, input.content);
      return { updatedAt: updatedAt.toISOString() };
    }),

  publish: kyte
    .input(kyteIdInput)
    .output(z.object({ publishSeq: z.number().int(), publishedAt: z.string() }))
    .mutation(async ({ ctx }) => {
      assertCan(ctx.access.effectiveRole, "publish");
      const k = ctx.access.kyte!;
      await assertRedirectDoesNotLoop(ctx.store, k, k.draft);
      const result = await ctx.store.publishKyte({ kyteId: k.id, actorUserId: ctx.user.id });
      await afterPublish(k, result.publishSeq);
      // Emitted server-side like signup_completed: the client can't know the
      // signup timestamp and would miss publishes from other entry points.
      // Fires on each kyte's FIRST publish, so a second kyte publishes a large
      // value — aggregations take min(ms) per user to get true signup→live.
      if (result.publishSeq === 1) {
        const publisher = await ctx.store.userById(ctx.user.id);
        if (publisher) {
          trackProductEvent({
            event: "signup_to_live_ms",
            userId: ctx.user.id,
            kyteId: k.id,
            properties: {
              ms: Math.max(0, result.publishedAt.getTime() - publisher.createdAt.getTime()),
            },
          });
        }
      }
      return { publishSeq: result.publishSeq, publishedAt: result.publishedAt.toISOString() };
    }),

  checkUsername: authed
    .input(z.object({ username: usernameSchema, kyteId: z.string().min(1).optional() }))
    .output(
      z.object({
        available: z.boolean(),
        reason: z.enum(["empty", "too_long", "invalid_chars", "reserved", "unsafe_dot", "taken"]).nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const validation = validateUsername(input.username);
      if (!validation.ok) {
        return { available: false, reason: validation.reason };
      }
      const owner = await ctx.store.usernameOwner(validation.username);
      return owner && owner !== input.kyteId
        ? { available: false, reason: "taken" as const }
        : { available: true, reason: null };
    }),

  changeUsername: kyte
    .input(z.object({ kyteId: z.string().min(1), username: usernameSchema }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "change_username");
      const k = ctx.access.kyte!;
      const owner = await ctx.store.usernameOwner(input.username);
      if (owner && owner !== k.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Username already taken." });
      }
      await ctx.store.changeUsername({ kyteId: k.id, actorUserId: ctx.user.id, username: input.username });
      await afterUsernameChange(k.id, k.username, input.username);
      return { ok: true } as const;
    }),

  delete: kyte
    .input(z.object({ kyteId: z.string().min(1), confirm: z.string().min(1) }))
    .output(okSchema)
    .mutation(async ({ ctx }) => {
      assertCan(ctx.access.effectiveRole, "delete_kyte");
      const k = ctx.access.kyte!;
      await ctx.store.deleteKyte({ kyteId: k.id, actorUserId: ctx.user.id });
      if (k.username) await enqueueSitemapRefresh("kyte-deleted");
      return { ok: true } as const;
    }),

});
