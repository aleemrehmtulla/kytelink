import { STATIC_SITEMAP_PATHS } from "@kytelink/schemas";
import { publicWebUrl } from "./env";

export const LLMS_TXT_PATH = "/llms.txt";

const APP_ONLY_PATHS = ["/edit", "/account", "/invites", "/onboarding", "/p/"];

const USER_INITIATED_FETCHERS = ["ChatGPT-User", "Claude-User", "Perplexity-User"];

const AI_CORPUS_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "CCBot",
];

function userAgentLines(agents: string[]): string[] {
  return agents.map((agent) => `User-agent: ${agent}`);
}

const VISITOR_RULES = ["Allow: /", ...APP_ONLY_PATHS.map((path) => `Disallow: ${path}`)];

const MARKETING_ALLOW_RULES = [
  ...new Set(
    [...STATIC_SITEMAP_PATHS, LLMS_TXT_PATH].flatMap((path) => {
      const [section, child] = path.split("/").filter(Boolean);
      return child ? [`/${section}/`] : [`${path}$`, `${path}?`];
    }),
  ),
].map((rule) => `Allow: ${rule}`);

// Serves /robots.txt for the web zone (editor + public profiles). Public profile
// pages are indexable; the authenticated app surface is disallowed. Points crawlers
// at the sitemap (16-seo.md).
export function buildRobotsTxt({ isPrimaryHost }: { isPrimaryHost: boolean }): string {
  const base = publicWebUrl().replace(/\/+$/, "");
  return [
    "User-agent: *",
    ...VISITOR_RULES,
    "",
    ...userAgentLines(USER_INITIATED_FETCHERS),
    ...VISITOR_RULES,
    "",
    ...userAgentLines(AI_CORPUS_CRAWLERS),
    ...(isPrimaryHost ? MARKETING_ALLOW_RULES : []),
    "Disallow: /",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}
