import { z } from "zod";
import { createHash } from "node:crypto";
import { inviteStatusSchema, LIMIT_DEFAULTS, resolveLimit, roleSchema } from "@kytelink/schemas";
import { router } from "@kytelink/trpc";
import { TRPCError } from "@trpc/server";
import { authed } from "../trpc/procedures";
import { okSchema } from "./shapes";
import type { InviteRow, Store } from "../store/store";

const myInviteSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  orgName: z.string(),
  role: roleSchema,
  status: inviteStatusSchema,
  invitedByEmail: z.string().nullable(),
  invitedEmail: z.string(),
  expiresAt: z.string(),
});

const inviteActionInput = z
  .object({
    inviteId: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.inviteId) || Boolean(value.token), {
    message: "inviteId (in-app) or token (email link) is required",
  });

async function findInvite(
  store: Store,
  email: string,
  input: { inviteId?: string; token?: string },
): Promise<InviteRow | null> {
  if (input.token) {
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    return store.getInviteByTokenHash(tokenHash);
  }
  if (input.inviteId) {
    const invite = await store.getInviteById(input.inviteId);
    return invite && invite.email === email ? invite : null;
  }
  return null;
}

export const invitesRouter = router({
  listMine: authed
    .output(z.object({ invites: z.array(myInviteSchema) }))
    .query(async ({ ctx }) => {
      const email = ctx.user.email.trim().toLowerCase();
      const rows = await ctx.store.listInvitesForEmail(email);
      const invites = [];
      for (const i of rows) {
        if (i.status !== "PENDING") continue;
        const org = await ctx.store.orgById(i.orgId);
        const inviter = await ctx.store.userById(i.invitedByUserId);
        invites.push({
          id: i.id,
          orgId: i.orgId,
          orgName: org?.name ?? "",
          role: i.role,
          status: i.status,
          invitedByEmail: inviter?.email ?? null,
          invitedEmail: i.email,
          expiresAt: i.expiresAt.toISOString(),
        });
      }
      return { invites };
    }),

  accept: authed
    .input(inviteActionInput)
    .output(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const email = ctx.user.email.trim().toLowerCase();
      const invite = await findInvite(ctx.store, email, input);
      if (!invite || invite.status !== "PENDING") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite is not available." });
      }
      if (invite.expiresAt.getTime() < Date.now()) {
        await ctx.store.setInviteStatus({
          inviteId: invite.id,
          status: "EXPIRED",
          actorUserId: ctx.user.id,
        });
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite has expired." });
      }
      if (invite.email !== email) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invite is for another address." });
      }
      const joined = await ctx.store.joinedOrgCount(ctx.user.id);
      if (joined >= resolveLimit(LIMIT_DEFAULTS.orgsJoinedPerUser)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You have joined too many organizations." });
      }
      return ctx.store.acceptInvite({ inviteId: invite.id, userId: ctx.user.id });
    }),

  decline: authed
    .input(inviteActionInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const email = ctx.user.email.trim().toLowerCase();
      const invite = await findInvite(ctx.store, email, input);
      // The email-link branch resolves an invite by token alone; enforce the same
      // recipient-match that accept does so a leaked token can't be used to
      // decline someone else's invite (S5).
      if (invite && invite.status === "PENDING" && invite.email === email) {
        await ctx.store.setInviteStatus({
          inviteId: invite.id,
          status: "DECLINED",
          actorUserId: ctx.user.id,
        });
      }
      return { ok: true } as const;
    }),
});
