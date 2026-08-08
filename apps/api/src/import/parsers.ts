import {
  IMPORT_MAX_LINKS,
  type ImportProposal,
  importProposalSchema,
  type Link,
  MAX_DESCRIPTION_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  prefixHttps,
  safeWebUrlSchema,
} from "@kytelink/schemas";

export type ImportPlatform = "linktree" | "beacons" | "biolink" | "generic";

export function detectPlatform(url: string): ImportPlatform {
  const host = safeHost(url);
  if (host.includes("linktr.ee")) return "linktree";
  if (host.includes("beacons.ai")) return "beacons";
  if (host.includes("bio.link")) return "biolink";
  return "generic";
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function metaContent(html: string, property: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const match = pattern.exec(html);
  const content = match?.[1];
  return content ? decodeEntities(content) : undefined;
}

function extractLinks(html: string): Link[] {
  const anchor = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  const links: Link[] = [];
  let match: RegExpExecArray | null;
  while ((match = anchor.exec(html)) !== null && links.length < IMPORT_MAX_LINKS) {
    const href = decodeEntities((match[1] ?? "").trim());
    const rawTitle = decodeEntities((match[2] ?? "").replace(/<[^>]+>/g, " ")).slice(0, 80);
    const normalized = safeWebUrlSchema.safeParse(prefixHttps(href));
    if (!normalized.success) continue;
    if (seen.has(normalized.data)) continue;
    seen.add(normalized.data);
    links.push({ title: rawTitle.length > 0 ? rawTitle : normalized.data, link: normalized.data });
  }
  return links;
}

export function parseHtmlToProposal(html: string): ImportProposal {
  const displayName = metaContent(html, "og:title") ?? metaContent(html, "twitter:title");
  const description =
    metaContent(html, "og:description") ?? metaContent(html, "description");
  const avatar = metaContent(html, "og:image");
  const avatarUrl = avatar ? safeWebUrlSchema.safeParse(avatar) : undefined;

  return importProposalSchema.parse({
    displayName,
    description,
    avatarUrl: avatarUrl && avatarUrl.success ? avatarUrl.data : undefined,
    links: extractLinks(html),
    icons: [],
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractNextData(html: string): unknown {
  const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match?.[1]) return undefined;
  try {
    return JSON.parse(match[1]) as unknown;
  } catch {
    return undefined;
  }
}

// Linktree is a client-rendered Next.js app: the visible `<a>` anchors on a
// profile are mostly chrome (footer, "report", and the "discover other creators"
// carousel), while the creator's actual links live in the embedded
// `__NEXT_DATA__` JSON as `props.pageProps.links`. Scraping anchors imports that
// chrome as if it were the profile, so read the structured data instead.
export function parseLinktreeToProposal(html: string): ImportProposal | null {
  const pageProps = asRecord(asRecord(asRecord(extractNextData(html))?.props)?.pageProps);
  if (!pageProps) return null;

  const rawLinks = Array.isArray(pageProps.links) ? pageProps.links : [];
  const seen = new Set<string>();
  const links: Link[] = [];
  for (const entry of rawLinks) {
    if (links.length >= IMPORT_MAX_LINKS) break;
    const item = asRecord(entry);
    // Group headers and section titles carry an empty `url`; skip them.
    const href = item ? nonEmptyString(item.url) : undefined;
    if (!href) continue;
    const normalized = safeWebUrlSchema.safeParse(prefixHttps(href));
    if (!normalized.success || seen.has(normalized.data)) continue;
    seen.add(normalized.data);
    const title = nonEmptyString(item?.title)?.slice(0, 80);
    links.push({ title: title ?? normalized.data, link: normalized.data });
  }
  if (links.length === 0) return null;

  const account = asRecord(pageProps.account);
  const avatar = nonEmptyString(account?.profilePictureUrl);
  const avatarUrl = avatar ? safeWebUrlSchema.safeParse(avatar) : undefined;

  return importProposalSchema.parse({
    displayName: nonEmptyString(pageProps.pageTitle)?.slice(0, MAX_DISPLAY_NAME_LENGTH),
    description: nonEmptyString(pageProps.description)?.slice(0, MAX_DESCRIPTION_LENGTH),
    avatarUrl: avatarUrl && avatarUrl.success ? avatarUrl.data : undefined,
    links,
    icons: [],
  });
}

export function emptyProposal(): ImportProposal {
  return { links: [], icons: [] };
}
