import { z } from "zod";
import { assetKindSchema } from "@kytelink/schemas";
import { kyteProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import { okSchema } from "../shapes";

export const assetsRouter = router({
  createUploadUrl: kyteProcedure
    .input(
      z.object({
        kyteId: z.string().min(1),
        kind: assetKindSchema,
        contentType: z.string().min(1),
        sizeBytes: z.number().int().positive(),
      }),
    )
    .output(
      z.object({
        assetId: z.string(),
        uploadUrl: z.string(),
        fields: z.record(z.string(), z.string()).nullable(),
        key: z.string(),
      }),
    )
    .mutation(() => {
      throw notImplemented("assets.createUploadUrl");
    }),

  finalize: kyteProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .output(z.object({ url: z.string(), lqip: z.string().nullable() }))
    .mutation(() => {
      throw notImplemented("assets.finalize");
    }),

  delete: kyteProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("assets.delete");
    }),
});
