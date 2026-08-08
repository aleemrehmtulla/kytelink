import { taggedLogger } from "../logger";
import type { DomainProvider } from "./provider";
import { createProxyDomainProvider } from "./proxy-provider";
import { createVercelDomainProvider } from "./vercel-provider";
import { recordTargets, type RecordTargets } from "./records";

const log = taggedLogger("domains");

export type { DomainConnectionState, DomainProvider } from "./provider";
export { verificationRecords } from "./records";

let cached: DomainProvider | null = null;

export function resolveRecordTargets(env: NodeJS.ProcessEnv = process.env): RecordTargets {
  return recordTargets({
    CUSTOM_DOMAIN_A_RECORD: env.CUSTOM_DOMAIN_A_RECORD,
    CUSTOM_DOMAIN_CNAME_TARGET: env.CUSTOM_DOMAIN_CNAME_TARGET,
    DOMAIN_PROVIDER: normalizeProvider(env.DOMAIN_PROVIDER),
  });
}

const DOMAIN_PROVIDERS = ["proxy", "vercel"] as const;

export function isKnownProvider(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "" || (DOMAIN_PROVIDERS as readonly string[]).includes(normalized);
}

// Total by design: an unrecognised value falls back to the safe default rather
// than refusing to boot over one optional feature. A typo is surfaced by the
// boot warning instead (`vercell` silently becoming proxy is how domains break
// without anyone noticing).
export function normalizeProvider(value: string | undefined): "vercel" | "proxy" {
  return (value ?? "").trim().toLowerCase() === "vercel" ? "vercel" : "proxy";
}

function createDomainProvider(env: NodeJS.ProcessEnv = process.env): DomainProvider {
  const targets = resolveRecordTargets(env);
  if (normalizeProvider(env.DOMAIN_PROVIDER) === "vercel") {
    const token = env.VERCEL_TOKEN?.trim();
    const team = env.VERCEL_TEAM?.trim();
    const project = env.VERCEL_PROJECT?.trim();
    if (token && team && project) {
      return createVercelDomainProvider({ token, team, project }, log);
    }
    // Misconfigured rather than unset: falling back silently would let domains
    // sit PENDING forever with no clue why, which is the bug this seam replaced.
    log.warn(
      "DOMAIN_PROVIDER=vercel but VERCEL_TOKEN/VERCEL_TEAM/VERCEL_PROJECT are incomplete — " +
        "falling back to DNS-only verification, so domains will never activate. Set all three.",
    );
  }
  return createProxyDomainProvider(targets);
}

export function getDomainProvider(): DomainProvider {
  cached ??= createDomainProvider();
  return cached;
}
