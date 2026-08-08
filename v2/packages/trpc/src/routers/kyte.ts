import { z } from "zod";
import {
  moderationStatusSchema,
  profileContentSchema,
  roleSchema,
  usernameSchema,
} from "@kytelink/schemas";
import { authedProcedure, kyteProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import { kyteIdInput, okSchema } from "../shapes";

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
  get: kyteProcedure
    .input(kyteIdInput)
    .output(kyteGetOutput)
    .query(() => {
      throw notImplemented("kyte.get");
    }),

  create: authedProcedure
    .input(z.object({ orgId: z.string().min(1).optional(), username: usernameSchema }))
    .output(z.object({ kyteId: z.string() }))
    .mutation(() => {
      throw notImplemented("kyte.create");
    }),

  updateDraft: kyteProcedure
    .input(
      z.object({
        kyteId: z.string().min(1),
        content: profileContentSchema,
        baseUpdatedAt: z.coerce.date(),
      }),
    )
    .output(z.object({ updatedAt: z.string() }))
    .mutation(() => {
      throw notImplemented("kyte.updateDraft");
    }),

  publish: kyteProcedure
    .input(kyteIdInput)
    .output(z.object({ publishSeq: z.number().int(), publishedAt: z.string() }))
    .mutation(() => {
      throw notImplemented("kyte.publish");
    }),

  checkUsername: authedProcedure
    .input(z.object({ username: usernameSchema, kyteId: z.string().min(1).optional() }))
    .output(
      z.object({
        available: z.boolean(),
        reason: z.enum(["empty", "too_long", "invalid_chars", "reserved", "unsafe_dot", "taken"]).nullable(),
      }),
    )
    .query(() => {
      throw notImplemented("kyte.checkUsername");
    }),

  changeUsername: kyteProcedure
    .input(z.object({ kyteId: z.string().min(1), username: usernameSchema }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("kyte.changeUsername");
    }),

  delete: kyteProcedure
    .input(z.object({ kyteId: z.string().min(1), confirm: z.string().min(1) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("kyte.delete");
    }),

});
