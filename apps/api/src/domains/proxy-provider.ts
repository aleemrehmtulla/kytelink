import { Resolver } from "node:dns/promises";
import type { DomainConnectionState, DomainProvider } from "./provider";
import type { RecordTargets } from "./records";

const LOOKUP_TIMEOUT_MS = 5_000;

export interface DnsLookup {
  cname(host: string): Promise<string[]>;
  a(host: string): Promise<string[]>;
}

function createDnsLookup(): DnsLookup {
  const resolver = new Resolver({ timeout: LOOKUP_TIMEOUT_MS, tries: 2 });
  return {
    async cname(host) {
      return resolver.resolveCname(host).catch(() => []);
    },
    async a(host) {
      return resolver.resolve4(host).catch(() => []);
    },
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

/**
 * Self-host path. There is nothing to register with an external service: the
 * operator's reverse proxy issues certificates on demand for any host this API
 * says is allowed, so a domain is connected as soon as its DNS points here.
 *
 * Both record shapes are accepted for either host kind on purpose — plenty of
 * DNS providers flatten an apex ALIAS/ANAME into A records, and plenty of users
 * add the A record to a subdomain. Either proves the same thing: traffic for
 * this host arrives at this deployment.
 */
export function createProxyDomainProvider(
  targets: RecordTargets,
  dns: DnsLookup = createDnsLookup(),
): DomainProvider {
  return {
    kind: "proxy",

    async attach() {
      // Nothing to register — the `ask` endpoint gates cert issuance instead.
    },

    async detach() {
      // Certificates are issued on demand and simply stop being renewed once the
      // `ask` endpoint stops approving the host, so there is nothing to release.
    },

    async status(host): Promise<DomainConnectionState> {
      const wantCname = targets.cnameTarget ? normalize(targets.cnameTarget) : null;
      const wantA = targets.aRecord ? normalize(targets.aRecord) : null;
      if (!wantCname && !wantA) return "ERROR";

      const [cnames, aRecords] = await Promise.all([dns.cname(host), dns.a(host)]);
      if (wantCname && cnames.some((value) => normalize(value) === wantCname)) return "CONNECTED";
      if (wantA && aRecords.some((value) => normalize(value) === wantA)) return "CONNECTED";
      return "PENDING";
    },
  };
}
