// Every entry must serve a real 200: /features and /use-cases exist only as
// /features/[slug] and /use-cases/[slug], so their index paths are absent.
export const STATIC_SITEMAP_PATHS = [
  "/",
  "/discover",
  "/pricing",
  "/legal",
  "/terms-of-service",
  "/privacy-policy",
  "/anti-phishing",
] as const;
