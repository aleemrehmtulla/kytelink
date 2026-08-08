import { z } from "zod";
import { dnsRecordSchema, domainStatusSchema } from "@kytelink/schemas";
import { kyteProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
import { kyteIdInput, okSchema } from "../shapes";

const domainSchema = z.object({
  id: z.string(),
  host: z.string(),
  status: domainStatusSchema,
  records: z.array(dnsRecordSchema),
  createdAt: z.string(),
});

export const domainsRouter = router({
  list: kyteProcedure
    .input(kyteIdInput)
    .output(z.object({ domains: z.array(domainSchema) }))
    .query(() => {
      throw notImplemented("domains.list");
    }),

  add: kyteProcedure
    .input(z.object({ kyteId: z.string().min(1), host: z.string().trim().min(1) }))
    .output(domainSchema)
    .mutation(() => {
      throw notImplemented("domains.add");
    }),

  status: kyteProcedure
    .input(z.object({ domainId: z.string().min(1) }))
    .output(z.object({ status: domainStatusSchema, records: z.array(dnsRecordSchema) }))
    .query(() => {
      throw notImplemented("domains.status");
    }),

  // `status` reports the last recorded state; `verify` asks the provider live and
  // writes the result — it is the only path that flips a domain into serving.
  verify: kyteProcedure
    .input(z.object({ domainId: z.string().min(1) }))
    .output(z.object({ status: domainStatusSchema, records: z.array(dnsRecordSchema) }))
    .mutation(() => {
      throw notImplemented("domains.verify");
    }),

  remove: kyteProcedure
    .input(z.object({ domainId: z.string().min(1) }))
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("domains.remove");
    }),
});
