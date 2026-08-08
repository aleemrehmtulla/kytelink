import { z } from "zod";
import { authedProcedure, kyteProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import {
  auditEntrySchema,
  okSchema,
  orgIdInput,
  orgStorageSchema,
  orgSummarySchema,
} from "../shapes";

export const orgRouter = router({
  listMine: authedProcedure
    .output(z.object({ orgs: z.array(orgSummarySchema) }))
    .query(() => {
      throw notImplemented("org.listMine");
    }),

  create: authedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(60).optional() }))
    .output(z.object({ orgId: z.string() }))
    .mutation(() => {
      throw notImplemented("org.create");
    }),

  rename: kyteProcedure
    .input(orgIdInput.extend({ name: z.string().trim().min(1).max(60) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("org.rename");
    }),

  delete: kyteProcedure
    .input(orgIdInput.extend({ confirm: z.string().min(1) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("org.delete");
    }),

  storage: kyteProcedure
    .input(orgIdInput)
    .output(orgStorageSchema)
    .query(() => {
      throw notImplemented("org.storage");
    }),

  auditLog: kyteProcedure
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
    .query(() => {
      throw notImplemented("org.auditLog");
    }),
});
