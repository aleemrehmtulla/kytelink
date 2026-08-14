import { publicLandingUrl } from "../lib/env";

export const MARKETING_ROUTE_PREFIXES = [
  "features",
  "use-cases",
  "pricing",
  "discover",
  "legal",
  "terms-of-service",
  "privacy-policy",
  "anti-phishing",
  "self-hosting",
  "report",
  "appeal",
  "landing-assets",
] as const;

export const LANDING_ORIGIN = publicLandingUrl();
