import type { DnsRecord } from "@kytelink/schemas";

// Vercel's published anycast A record and CNAME target. These are the hosted
// deployment's defaults, not universal truths — a self-hoster overrides both via
// CUSTOM_DOMAIN_A_RECORD / CUSTOM_DOMAIN_CNAME_TARGET so their users are told to
// point at *their* edge. Getting this wrong sends a customer's traffic to
// somebody else's infrastructure, so the env values always win.
const VERCEL_A_RECORD = "76.76.21.21";
const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";

export function isApex(host: string): boolean {
  return host.split(".").length <= 2;
}

export function wwwOf(host: string): string {
  return `www.${host}`;
}

export interface RecordTargets {
  aRecord: string;
  cnameTarget: string;
}

export function recordTargets(env: {
  CUSTOM_DOMAIN_A_RECORD?: string;
  CUSTOM_DOMAIN_CNAME_TARGET?: string;
  DOMAIN_PROVIDER?: string;
}): RecordTargets {
  const vercel = env.DOMAIN_PROVIDER === "vercel";
  return {
    aRecord: env.CUSTOM_DOMAIN_A_RECORD?.trim() || (vercel ? VERCEL_A_RECORD : ""),
    cnameTarget: env.CUSTOM_DOMAIN_CNAME_TARGET?.trim() || (vercel ? VERCEL_CNAME_TARGET : ""),
  };
}

/**
 * The DNS records a user must create for `host`. An apex domain needs an A
 * record (CNAMEs are illegal at the zone apex); a subdomain takes a CNAME. Both
 * are offered for an apex so anyone whose provider supports ALIAS/ANAME flattening
 * can use the CNAME instead.
 */
export function verificationRecords(host: string, targets: RecordTargets): DnsRecord[] {
  const records: DnsRecord[] = [];
  if (isApex(host)) {
    if (targets.aRecord) records.push({ type: "A", name: host, value: targets.aRecord });
    if (targets.cnameTarget) {
      records.push({ type: "CNAME", name: wwwOf(host), value: targets.cnameTarget });
    }
    return records;
  }
  if (targets.cnameTarget) records.push({ type: "CNAME", name: host, value: targets.cnameTarget });
  return records;
}
