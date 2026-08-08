import { z } from "zod";
import { authedProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import { okSchema } from "../shapes";

const passkeySchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
});

const passkeysRouter = router({
  list: authedProcedure
    .output(z.object({ passkeys: z.array(passkeySchema) }))
    .query(() => {
      throw notImplemented("account.passkeys.list");
    }),

  rename: authedProcedure
    .input(z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(60) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("account.passkeys.rename");
    }),

  remove: authedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("account.passkeys.remove");
    }),
});

export const accountRouter = router({
  get: authedProcedure
    .output(
      z.object({
        id: z.string(),
        email: z.string(),
        createdAt: z.string(),
        image: z.string().nullable(),
        passkeys: z.array(passkeySchema),
      }),
    )
    .query(() => {
      throw notImplemented("account.get");
    }),

  setAvatar: authedProcedure
    .input(z.object({ image: z.string().max(2_000_000).nullable() }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("account.setAvatar");
    }),

  changeEmail: authedProcedure
    .input(z.object({ newEmail: z.email(), otp: z.string().optional() }))
    .output(z.object({ ok: z.literal(true), otpSent: z.boolean() }))
    .mutation(() => {
      throw notImplemented("account.changeEmail");
    }),

  passkeys: passkeysRouter,
});
