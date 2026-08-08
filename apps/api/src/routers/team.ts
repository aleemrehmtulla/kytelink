import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import {
  canManageMember,
  INVITE_EXPIRY_DAYS,
  kyteAccessSchema,
  kyteGrantSchema,
  orgInvitePayloadSchema,
  roleSchema,
} from "@kytelink/schemas";
import { router } from "@kytelink/trpc";
import { TRPCError } from "@trpc/server";
import { kyte } from "../trpc/procedures";
import { assertCan } from "../trpc/permissions";
import { assertCountLimit } from "../trpc/limits";
import { enforceRateLimit, isRedisLike, RedisRateLimiter } from "../trpc/rate-limit";
import { memberSchema, okSchema, orgIdInput } from "./shapes";

export const teamRouter = router({
  members: kyte
    .input(orgIdInput)
    .output(z.object({ members: z.array(memberSchema) }))
    .query(async ({ ctx }) => {
      assertCan(ctx.access.orgMember.role, "manage_members");
      const members = await ctx.store.listOrgMembers(ctx.access.org.id);
      return { members };
    }),

  invite: kyte
    .input(orgIdInput.and(orgInvitePayloadSchema))
    .output(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.orgMember.role, "manage_members");
      if (!canManageMember(ctx.access.orgMember.role, input.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot invite at or above your role." });
      }
      if (isRedisLike(ctx.redis)) {
        await enforceRateLimit(
          new RedisRateLimiter(ctx.redis),
          "invite-send",
          { user: ctx.user.id, org: ctx.access.org.id },
          { failOpen: false },
        );
      }
      const orgId = ctx.access.org.id;
      const memberCount = (await ctx.store.listOrgMembers(orgId)).length;
      const pendingCount = await ctx.store.countActiveInvites(orgId);
      assertCountLimit(memberCount + pendingCount, ctx.access.org, "peoplePerOrg");

      const token = randomBytes(24).toString("base64url");
      return ctx.store.createInvite({
        orgId,
        email: input.email,
        role: input.role,
        kyteAccess: input.kyteAccess,
        kyteGrants: input.kyteGrants ?? [],
        invitedById: ctx.user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      });
    }),

  revokeInvite: kyte
    .input(z.object({ inviteId: z.string().min(1) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.orgMember.role, "manage_members");
      const invite = await ctx.store.getInviteById(input.inviteId);
      if (invite && invite.orgId === ctx.access.org.id && invite.status === "PENDING") {
        await ctx.store.setInviteStatus({
          inviteId: invite.id,
          status: "REVOKED",
          actorUserId: ctx.user.id,
        });
      }
      return { ok: true } as const;
    }),

  updateAccess: kyte
    .input(
      orgIdInput.extend({
        membershipId: z.string().min(1),
        role: roleSchema,
        kyteAccess: kyteAccessSchema,
        kyteGrants: z.array(kyteGrantSchema).optional(),
      }),
    )
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.orgMember.role, "manage_members");
      const actorRole = ctx.access.orgMember.role;
      const isOwner = actorRole === "OWNER";
      const members = await ctx.store.listOrgMembers(ctx.access.org.id);
      const target = members.find((m) => m.membershipId === input.membershipId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
      }
      // An OWNER manages everyone (incl. other owners) and may grant OWNER
      // (manage_owners is an OWNER capability, doc-04). Everyone else stays
      // bound by the strict-rank canManageMember rule.
      const canManageTarget = isOwner || canManageMember(actorRole, target.role);
      const canAssignRole = isOwner || canManageMember(actorRole, input.role);
      if (!canManageTarget || !canAssignRole) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot manage this member." });
      }
      if (target.role === "OWNER" && input.role !== "OWNER") {
        const owners = members.filter((m) => m.role === "OWNER").length;
        if (owners <= 1) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot demote the last owner." });
        }
      }
      // OWNER/ADMIN are org-wide (ALL) with no per-kyte grant rows — keep that
      // invariant when promoting to OWNER.
      const promotingToOwner = input.role === "OWNER";
      await ctx.store.updateMemberAccess({
        orgId: ctx.access.org.id,
        membershipId: input.membershipId,
        role: input.role,
        kyteAccess: promotingToOwner ? "ALL" : input.kyteAccess,
        kyteGrants: promotingToOwner ? [] : input.kyteGrants ?? [],
        actorUserId: ctx.user.id,
      });
      return { ok: true } as const;
    }),

  removeMember: kyte
    .input(orgIdInput.extend({ membershipId: z.string().min(1) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.orgMember.role, "manage_members");
      const members = await ctx.store.listOrgMembers(ctx.access.org.id);
      const target = members.find((m) => m.membershipId === input.membershipId);
      if (!target) return { ok: true } as const;
      if (target.role === "OWNER") {
        // Only an OWNER can remove another OWNER, and never the last one (doc-04).
        if (ctx.access.orgMember.role !== "OWNER") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only an owner can remove an owner." });
        }
        const owners = members.filter((m) => m.role === "OWNER").length;
        if (owners <= 1) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the last owner." });
        }
      } else if (!canManageMember(ctx.access.orgMember.role, target.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove this member." });
      }
      await ctx.store.removeMember({
        orgId: ctx.access.org.id,
        membershipId: input.membershipId,
        actorUserId: ctx.user.id,
      });
      return { ok: true } as const;
    }),

  leave: kyte
    .input(orgIdInput)
    .output(okSchema)
    .mutation(async ({ ctx }) => {
      if (ctx.access.orgMember.role === "OWNER") {
        // A non-last owner may leave; the last owner is pinned (doc-04). Personal
        // orgs always have a single owner, so this also blocks leaving one.
        const members = await ctx.store.listOrgMembers(ctx.access.org.id);
        const owners = members.filter((m) => m.role === "OWNER").length;
        if (owners <= 1) {
          throw new TRPCError({ code: "FORBIDDEN", message: "The last owner cannot leave the org." });
        }
      }
      await ctx.store.leaveOrg({ orgId: ctx.access.org.id, userId: ctx.user.id });
      return { ok: true } as const;
    }),
});
