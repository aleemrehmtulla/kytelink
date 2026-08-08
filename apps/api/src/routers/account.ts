import { z } from "zod";
import { getDb } from "@kytelink/db";
import { router } from "@kytelink/trpc";
import { TRPCError } from "@trpc/server";
import { authed } from "../trpc/procedures";
import { getAuth } from "../auth/auth";
import { okSchema } from "./shapes";

const passkeySchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
});

type PasskeyView = z.infer<typeof passkeySchema>;

async function listPasskeysFor(userId: string): Promise<PasskeyView[]> {
  const rows = await getDb().passkey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? "Passkey",
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: null,
  }));
}

const passkeysRouter = router({
  list: authed
    .output(z.object({ passkeys: z.array(passkeySchema) }))
    .query(async ({ ctx }) => ({ passkeys: await listPasskeysFor(ctx.user.id) })),

  rename: authed
    .input(z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(60) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const { count } = await getDb().passkey.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { name: input.name },
      });
      if (count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Passkey not found." });
      }
      return { ok: true } as const;
    }),

  remove: authed
    .input(z.object({ id: z.string().min(1) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      await getDb().passkey.deleteMany({ where: { id: input.id, userId: ctx.user.id } });
      return { ok: true } as const;
    }),
});

export const accountRouter = router({
  get: authed
    .output(
      z.object({
        id: z.string(),
        email: z.string(),
        createdAt: z.string(),
        image: z.string().nullable(),
        passkeys: z.array(passkeySchema),
      }),
    )
    .query(async ({ ctx }) => {
      const user = await ctx.store.userById(ctx.user.id);
      return {
        id: ctx.user.id,
        email: ctx.user.email,
        createdAt: (user?.createdAt ?? new Date()).toISOString(),
        image: user?.image ?? null,
        passkeys: await listPasskeysFor(ctx.user.id),
      };
    }),

  setAvatar: authed
    .input(z.object({ image: z.string().max(2_000_000).nullable() }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.store.setUserImage(ctx.user.id, input.image);
      return { ok: true } as const;
    }),

  changeEmail: authed
    .input(z.object({ newEmail: z.email(), otp: z.string().optional() }))
    .output(z.object({ ok: z.literal(true), otpSent: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const newEmail = input.newEmail.trim().toLowerCase();
      const existing = await ctx.store.userByEmail(newEmail);
      if (existing && newEmail !== ctx.user.email) {
        throw new TRPCError({ code: "CONFLICT", message: "That email is already in use." });
      }

      const auth = getAuth();
      if (!input.otp) {
        await auth.api.sendVerificationOTP({ body: { email: newEmail, type: "email-verification" } });
        return { ok: true as const, otpSent: true };
      }

      const verified = await auth.api.checkVerificationOTP({
        body: { email: newEmail, otp: input.otp, type: "email-verification" },
      });
      if (!verified.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired code." });
      }
      await ctx.store.changeEmail(ctx.user.id, newEmail);
      await ctx.store.invalidateUserSessions(ctx.user.id);
      return { ok: true as const, otpSent: false };
    }),

  passkeys: passkeysRouter,
});
