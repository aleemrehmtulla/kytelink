import { previewLinkSchema } from "@kytelink/schemas";
import { kyteProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import { kyteIdInput } from "../shapes";

export const previewRouter = router({
  // A kyte owns exactly one preview link, so there is nothing to list and
  // nothing to pick: `ensure` is a mutation because the first call for a kyte
  // mints the link (and a lapsed one is re-issued in place).
  ensure: kyteProcedure
    .input(kyteIdInput)
    .output(previewLinkSchema)
    .mutation(() => {
      throw notImplemented("preview.ensure");
    }),

  rotate: kyteProcedure
    .input(kyteIdInput)
    .output(previewLinkSchema)
    .mutation(() => {
      throw notImplemented("preview.rotate");
    }),
});
