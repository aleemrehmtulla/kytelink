const AGENT_API = "http://localhost:4003";
const DEV_API = "http://localhost:3003";
const AGENT_WEB = "http://localhost:4000";
const DEV_WEB = "http://localhost:3000";
const AGENT_LANDING = "http://localhost:4001";
const DEV_LANDING = "http://localhost:3001";
const PROD_LANDING = "https://kytelink.com";

export function isAgentMode(): boolean {
  return process.env.AGENT_MODE === "true";
}

// Browser-facing API origin (trpc, better-auth, beacons). Inlined by next.config
// with an agent-aware default so `pnpm agents` (api on :4003) works untouched.
export function publicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? (isAgentMode() ? AGENT_API : DEV_API);
}

// Browser-facing origin of this web app (editor + public profile), used to build
// shareable links (e.g. preview links). NEXT_PUBLIC_WEB_URL is auto-inlined by
// Next when set; falls back to the agent/dev default so links are never broken.
export function publicWebUrl(): string {
  return process.env.NEXT_PUBLIC_WEB_URL ?? (isAgentMode() ? AGENT_WEB : DEV_WEB);
}

// Browser-facing origin of the landing/marketing zone (logo home link, terms,
// privacy, the appeal form). Unlike the two above, an unset var must never
// yield localhost in a production build — marketing links in a misconfigured
// prod deploy should degrade to the real site, not a dead port.
export function publicLandingUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_LANDING_URL;
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return PROD_LANDING;
  return isAgentMode() ? AGENT_LANDING : DEV_LANDING;
}

// Server-only API origin for the HMAC internal endpoints. In agent mode the api
// always lives on :4003 regardless of the shared dev API_BASE_URL, so force it.
export function internalApiBase(): string {
  if (isAgentMode()) return AGENT_API;
  return process.env.API_BASE_URL ?? DEV_API;
}
