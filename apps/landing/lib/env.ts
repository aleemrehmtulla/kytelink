// Landing's /report form and /t/event beacons run in the browser, so they need
// the client-visible mirror — server-only API_BASE_URL is not reachable here.
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";
