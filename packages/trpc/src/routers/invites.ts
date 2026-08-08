import { z } from "zod";
import { inviteStatusSchema, roleSchema } from "@kytelink/schemas";
import { authedProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import { okSchema } from "../shapes";

// No raw token in the list: invite tokens are stored hashed and single-use
// (06-api.md). The in-app /invites flow acts on the opaque id (session email is
// the auth); the email-link flow supplies the raw token to accept/decline once.
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

export const invitesRouter = router({
  listMine: authedProcedure
    .output(z.object({ invites: z.array(myInviteSchema) }))
    .query(() => {
      throw notImplemented("invites.listMine");
    }),

  accept: authedProcedure
    .input(inviteActionInput)
    .output(z.object({ orgId: z.string() }))
    .mutation(() => {
      throw notImplemented("invites.accept");
    }),

  decline: authedProcedure
    .input(inviteActionInput)
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("invites.decline");
    }),
});
