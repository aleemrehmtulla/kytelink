import { z } from "zod";

// Richer than the Prisma Domain.verified boolean. Reconciliation:
// Domain.verified === true  <=>  DomainStatus "ACTIVE"; every other status
// (PENDING | VERIFYING | ERROR) maps to verified === false.
export const DOMAIN_STATUSES = ["PENDING", "VERIFYING", "ACTIVE", "ERROR"] as const;
export const domainStatusSchema = z.enum(DOMAIN_STATUSES);
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];

export function domainStatusFromVerified(verified: boolean): DomainStatus {
  return verified ? "ACTIVE" : "PENDING";
}

export function isVerifiedDomainStatus(status: DomainStatus): boolean {
  return status === "ACTIVE";
}

export const DNS_RECORD_TYPES = ["A", "CNAME"] as const;
export const dnsRecordTypeSchema = z.enum(DNS_RECORD_TYPES);

export const dnsRecordSchema = z.object({
  type: dnsRecordTypeSchema,
  name: z.string().min(1),
  value: z.string().min(1),
});

export type DnsRecord = z.infer<typeof dnsRecordSchema>;
