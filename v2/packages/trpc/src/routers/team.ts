import { z } from "zod";
import { kyteAccessSchema, kyteGrantSchema, orgInvitePayloadSchema, roleSchema } from "@kytelink/schemas";
import { kyteProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import { memberSchema, okSchema, orgIdInput } from "../shapes";

export const teamRouter = router({
  members: kyteProcedure
    .input(orgIdInput)
    .output(z.object({ members: z.array(memberSchema) }))
    .query(() => {
      throw notImplemented("team.members");
    }),

  invite: kyteProcedure
    .input(orgIdInput.and(orgInvitePayloadSchema))
    .output(z.object({ inviteId: z.string() }))
    .mutation(() => {
      throw notImplemented("team.invite");
    }),

  revokeInvite: kyteProcedure
    .input(z.object({ inviteId: z.string().min(1) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("team.revokeInvite");
    }),

  updateAccess: kyteProcedure
    .input(
      orgIdInput.extend({
        membershipId: z.string().min(1),
        role: roleSchema,
        kyteAccess: kyteAccessSchema,
        kyteGrants: z.array(kyteGrantSchema).optional(),
      }),
    )
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("team.updateAccess");
    }),

  removeMember: kyteProcedure
    .input(orgIdInput.extend({ membershipId: z.string().min(1) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("team.removeMember");
    }),

  leave: kyteProcedure
    .input(orgIdInput)
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("team.leave");
    }),
});
