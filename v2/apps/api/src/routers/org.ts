import { z } from "zod";
import { router } from "@kytelink/trpc";
import { TRPCError } from "@trpc/server";
import {
  type AuditAction,
  defaultOrgName,
  effectiveRole,
  LIMIT_DEFAULTS,
  resolveLimit,
} from "@kytelink/schemas";
import { authed, kyte } from "../trpc/procedures";
import { assertCan } from "../trpc/permissions";
import { assertCountLimit } from "../trpc/limits";
import {
  auditEntrySchema,
  okSchema,
  orgIdInput,
  orgStorageSchema,
  orgSummarySchema,
} from "./shapes";

export const orgRouter = router({
  listMine: authed
    .output(z.object({ orgs: z.array(orgSummarySchema) }))
    .query(async ({ ctx }) => {
      const memberships = await ctx.store.membershipsForUser(ctx.user.id);
      const loaded = await Promise.all(
        memberships.map(async (member) => {
          const org = await ctx.store.orgById(member.orgId);
          if (!org) return null;
          const orgKytes = await ctx.store.listKytesByOrg(org.id);
          return { member, org, orgKytes };
        }),
      );
      const present = loaded.filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      // One batched grant lookup for every kyte the caller might see, instead of
      // a per-kyte round trip (the KyteMember @@index([userId]) backs the IN).
      const allKyteIds = present.flatMap((entry) => entry.orgKytes.map((k) => k.id));
      const grants = await ctx.store.kyteMembersForUser(ctx.user.id, allKyteIds);
      const grantByKyte = new Map(grants.map((g) => [g.kyteId, g]));

      const orgs = [];
      for (const { member, org, orgKytes } of present) {
        const kytes = [];
        for (const k of orgKytes) {
          const grant = grantByKyte.get(k.id) ?? null;
          const role = effectiveRole(member, grant);
          if (role === null) continue;
          kytes.push({
            id: k.id,
            username: k.username,
            displayName: k.draft.displayName,
            theme: k.draft.theme,
            published: k.published !== null,
            moderationStatus: k.moderationStatus,
            effectiveRole: role,
          });
        }
        orgs.push({
          id: org.id,
          name: org.name,
          personal: org.personal,
          role: member.role,
          kyteAccess: member.kyteAccess,
          ownerUserId: org.ownerUserId,
          kytes,
        });
      }
      return { orgs };
    }),

  create: authed
    .input(z.object({ name: z.string().trim().min(1).max(60).optional() }))
    .output(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.store.ownedOrgCount(ctx.user.id);
      // The first org a user owns is their personal org: it is named after them
      // (not "Personal") and carries the personal flag so it can't be deleted.
      if (owned === 0) {
        const me = await ctx.store.userById(ctx.user.id);
        return ctx.store.createOrg({
          name: defaultOrgName(me?.name, ctx.user.email),
          ownerUserId: ctx.user.id,
          personal: true,
        });
      }
      const name = input.name?.trim();
      if (!name) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An organization name is required." });
      }
      const first = (await ctx.store.membershipsForUser(ctx.user.id))
        .map((m) => m.orgId)
        .find(() => true);
      const limitOrg = first ? await ctx.store.orgById(first) : null;
      if (limitOrg) assertCountLimit(owned, limitOrg, "orgsOwnedPerUser");
      return ctx.store.createOrg({ name, ownerUserId: ctx.user.id });
    }),

  rename: kyte
    .input(orgIdInput.extend({ name: z.string().trim().min(1).max(60) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.orgMember.role, "manage_org_settings");
      await ctx.store.renameOrg(ctx.access.org.id, input.name);
      return { ok: true } as const;
    }),

  delete: kyte
    .input(orgIdInput.extend({ confirm: z.string().min(1) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.orgMember.role, "delete_org");
      if (ctx.access.org.personal) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Personal organizations cannot be deleted; they are removed with the account.",
        });
      }
      if (input.confirm !== ctx.access.org.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirmation text does not match the organization name.",
        });
      }
      const kyteCount = await ctx.store.countKytesByOrg(ctx.access.org.id);
      if (kyteCount > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Delete or transfer every kyte before deleting the organization.",
        });
      }
      await ctx.store.deleteOrg(ctx.access.org.id);
      return { ok: true } as const;
    }),

  storage: kyte
    .input(orgIdInput)
    .output(orgStorageSchema)
    .query(async ({ ctx }) => {
      const orgId = ctx.access.org.id;
      const usedBytes = await ctx.store.sumAssetSizeForOrg(orgId);
      const orgKytes = await ctx.store.listKytesByOrg(orgId);
      const kytes = await Promise.all(
        orgKytes.map(async (k) => {
          const assets = await ctx.store.listAssetsForKyte(k.id);
          const bytes = assets.reduce((sum, a) => sum + a.sizeBytes, 0);
          return { kyteId: k.id, displayName: k.draft.displayName, bytes };
        }),
      );
      const limitBytes = resolveLimit(
        LIMIT_DEFAULTS.storageBytesPerOrg,
        ctx.access.org.limitOverrides.storageBytesPerOrg,
      );
      return { usedBytes, limitBytes, kytes };
    }),

  auditLog: kyte
    .input(
      z.object({
        orgId: z.string().min(1).optional(),
        kyteId: z.string().min(1).optional(),
        action: z.string().optional(),
        actorUserId: z.string().optional(),
        before: z.coerce.date().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .output(z.object({ entries: z.array(auditEntrySchema), nextCursor: z.string().nullable() }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.access.orgMember.role, "manage_org_settings");
      const rows = await ctx.store.auditLog({
        orgId: ctx.access.org.id,
        action: input.action,
        actorUserId: input.actorUserId,
        before: input.before,
        limit: input.limit,
      });
      const entries = rows.map((a) => ({
        id: a.id,
        action: a.action as AuditAction,
        actorUserId: a.actorUserId,
        actorEmail: a.actorEmail,
        orgId: a.orgId,
        kyteId: a.kyteId,
        meta: a.meta,
        createdAt: a.createdAt.toISOString(),
      }));
      return { entries, nextCursor: null };
    }),
});
