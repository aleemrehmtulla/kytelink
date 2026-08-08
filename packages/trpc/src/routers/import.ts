import { z } from "zod";
import { importProposalSchema, safeWebUrlSchema } from "@kytelink/schemas";
import { kyteProcedure, router } from "../trpc";
import { notImplemented } from "../errors";

export const importRouter = router({
  fromUrl: kyteProcedure
    .input(z.object({ kyteId: z.string().min(1), url: safeWebUrlSchema }))
    .output(importProposalSchema)
    .mutation(() => {
      throw notImplemented("import.fromUrl");
    }),
});
