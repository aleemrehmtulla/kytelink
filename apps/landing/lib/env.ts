// Landing's /report form and /t/event beacons run in the browser, so they need
// the client-visible mirror — server-only API_BASE_URL is not reachable here.
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

// Server-only origin for getStaticProps/ISR fetches. API_BASE_URL is the in-cluster
// address and is never inlined into the bundle, so the browser-visible mirror is the
// fallback rather than the other way round.
export function serverApiOrigin(): string {
  return process.env.API_BASE_URL ?? API_ORIGIN;
}
