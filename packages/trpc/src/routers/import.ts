import { z } from "zod";
import { importProposalSchema, safeWebUrlSchema } from "@kytelink/schemas";
import { authedProcedure, router } from "../trpc";
import { notImplemented } from "../errors";

export const importRouter = router({
  fromUrl: authedProcedure
    .input(z.object({ url: safeWebUrlSchema }))
    .output(importProposalSchema)
    .mutation(() => {
      throw notImplemented("import.fromUrl");
    }),
});
