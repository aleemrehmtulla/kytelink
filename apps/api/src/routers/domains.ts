import { z } from "zod";
import {
  dnsRecordSchema,
  domainStatusFromVerified,
  domainStatusSchema,
  hostsIncludeRedirectTarget,
  normalizeProfileHost,
  type DomainStatus,
  type ProfileContent,
} from "@kytelink/schemas";
import { router } from "@kytelink/trpc";
import { TRPCError } from "@trpc/server";
import { kyte } from "../trpc/procedures";
import { assertCan } from "../trpc/permissions";
import { getDomainProvider, resolveRecordTargets, verificationRecords } from "../domains";
import type { DomainConnectionState } from "../domains";
import { taggedLogger } from "../logger";
import { kyteIdInput, okSchema } from "./shapes";

const log = taggedLogger("domains");

const domainSchema = z.object({
  id: z.string(),
  host: z.string(),
  status: domainStatusSchema,
  records: z.array(dnsRecordSchema),
  createdAt: z.string(),
});

function recordsFor(host: string) {
  return verificationRecords(host, resolveRecordTargets());
}

// Connecting a domain the kyte already redirects to would create the loop from the other side.
function redirectsToHost(content: ProfileContent | null, host: string): boolean {
  if (!content?.shouldRedirect || !content.redirectUrl) return false;
  return hostsIncludeRedirectTarget([host], content.redirectUrl);
}

function statusFromConnection(state: DomainConnectionState): DomainStatus {
  if (state === "CONNECTED") return "ACTIVE";
  return state === "ERROR" ? "ERROR" : "PENDING";
}

export const domainsRouter = router({
  list: kyte
    .input(kyteIdInput)
    .output(z.object({ domains: z.array(domainSchema) }))
    .query(async ({ ctx }) => {
      assertCan(ctx.access.effectiveRole, "manage_domains");
      const domains = (await ctx.store.listDomains(ctx.access.kyte!.id)).map((d) => ({
        id: d.id,
        host: d.host,
        status: domainStatusFromVerified(d.verified),
        records: recordsFor(d.host),
        createdAt: d.createdAt.toISOString(),
      }));
      return { domains };
    }),

  add: kyte
    .input(z.object({ kyteId: z.string().min(1), host: z.string().trim().min(1) }))
    .output(domainSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "manage_domains");
      const k = ctx.access.kyte!;
      const host = input.host.trim().toLowerCase();
      const existing = await ctx.store.getDomain(host);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Domain already registered." });
      }

      const normalized = normalizeProfileHost(host);
      if (redirectsToHost(k.draft, normalized) || redirectsToHost(k.published, normalized)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This kyte already redirects to that domain, which would loop forever. Turn the redirect off first.",
        });
      }

      // Register with the provider BEFORE persisting: on the hosted path this is
      // what makes the edge accept the host and issue its certificate, and a row
      // we cannot serve is worse than a failed add the user can retry.
      try {
        await getDomainProvider().attach(host);
      } catch (error) {
        log.warn({ host, err: error }, "provider refused to register this domain — telling the user to retry");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not register that domain. It may already be in use elsewhere.",
        });
      }

      const row = await ctx.store.addDomain({ kyteId: k.id, host, actorUserId: ctx.user.id });
      return {
        id: row.id,
        host: row.host,
        status: domainStatusFromVerified(row.verified),
        records: recordsFor(row.host),
        createdAt: row.createdAt.toISOString(),
      };
    }),

  status: kyte
    .input(z.object({ domainId: z.string().min(1) }))
    .output(z.object({ status: domainStatusSchema, records: z.array(dnsRecordSchema) }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "manage_domains");
      const domain = await ctx.store.getDomain(input.domainId);
      if (!domain) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
      }
      return {
        status: domainStatusFromVerified(domain.verified),
        records: recordsFor(domain.host),
      };
    }),

  // The live check. `status` reads what we last recorded; this asks the provider
  // and writes the answer, which is what actually flips a domain into serving.
  verify: kyte
    .input(z.object({ domainId: z.string().min(1) }))
    .output(z.object({ status: domainStatusSchema, records: z.array(dnsRecordSchema) }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "manage_domains");
      const domain = await ctx.store.getDomain(input.domainId);
      if (!domain) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
      }

      let state: DomainConnectionState;
      try {
        state = await getDomainProvider().status(domain.host);
      } catch (error) {
        log.warn({ host: domain.host, err: error }, "status check failed — reporting this domain as ERROR");
        state = "ERROR";
      }

      const connected = state === "CONNECTED";
      await ctx.store.setDomainVerification({
        host: domain.host,
        verified: connected,
        ...(connected ? { lastVerifiedAt: new Date() } : {}),
      });

      return { status: statusFromConnection(state), records: recordsFor(domain.host) };
    }),

  remove: kyte
    .input(z.object({ domainId: z.string().min(1) }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "manage_domains");
      const domain = await ctx.store.getDomain(input.domainId);
      await ctx.store.removeDomain({ domainId: input.domainId, actorUserId: ctx.user.id });
      if (domain) {
        // Best-effort: the row is already gone, so a provider hiccup must not
        // fail the user's delete. The reaper re-detaches anything left behind.
        try {
          await getDomainProvider().detach(domain.host);
        } catch (error) {
          log.warn(
            { host: domain.host, err: error },
            "provider detach failed — the row is already deleted, so the reaper will retry",
          );
        }
      }
      return { ok: true } as const;
    }),
});
