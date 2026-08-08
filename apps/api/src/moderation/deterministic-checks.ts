import {
  BRAND_IMPERSONATION_KEYWORDS,
  FREE_EMAIL_DOMAINS,
  SKETCHY_TLDS,
  URL_BLOCKLIST_PATTERNS,
  URL_SHORTENERS,
} from "./brand-keywords";
import { extractHostname, findBrandLookalikeToken, isPunycodeHost } from "./lookalike";
import type {
  ModerationKyteSnapshot,
  ModerationSignals,
  ModerationVerdictResult,
  SusLinkSignal,
} from "./types";

function keywordMatch(text: string): string | null {
  const normalized = text.toLowerCase();
  for (const keyword of BRAND_IMPERSONATION_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(normalized)) return keyword;
  }
  return null;
}

function hostnameOf(url: string): string | null {
  return extractHostname(url);
}

function tldOf(hostname: string): string | null {
  const labels = hostname.split(".");
  return labels.length > 1 ? (labels[labels.length - 1] ?? null) : null;
}

function urlIsBlocklisted(url: string): string | null {
  const normalized = url.toLowerCase();
  for (const pattern of URL_BLOCKLIST_PATTERNS) {
    if (normalized.includes(pattern)) return pattern;
  }
  return null;
}

function urlIsShortenerOrSketchyTld(url: string): string | null {
  const hostname = hostnameOf(url);
  if (!hostname) return null;
  if (URL_SHORTENERS.has(hostname)) return `shortener:${hostname}`;
  const tld = tldOf(hostname);
  if (tld && SKETCHY_TLDS.has(tld)) return `sketchy_tld:.${tld}`;
  return null;
}

function urlIsLookalike(url: string): string | null {
  const hostname = hostnameOf(url);
  if (!hostname) return null;
  if (isPunycodeHost(hostname)) return "punycode_host";
  const brandToken = findBrandLookalikeToken(hostname);
  return brandToken ? `lookalike_of:${brandToken}` : null;
}

function checkNameImpersonation(snapshot: ModerationKyteSnapshot): {
  keyword: string;
  field: "username" | "displayName" | "description" | "linkTitle";
  value: string;
} | null {
  if (snapshot.username) {
    const hit = keywordMatch(snapshot.username);
    if (hit) return { keyword: hit, field: "username", value: snapshot.username };
  }
  if (snapshot.displayName) {
    const hit = keywordMatch(snapshot.displayName);
    if (hit) return { keyword: hit, field: "displayName", value: snapshot.displayName };
  }
  if (snapshot.description) {
    const hit = keywordMatch(snapshot.description);
    if (hit) return { keyword: hit, field: "description", value: snapshot.description };
  }
  for (const link of snapshot.links) {
    const hit = keywordMatch(link.title);
    if (hit) return { keyword: hit, field: "linkTitle", value: link.title };
  }
  return null;
}

function checkLinkPatterns(snapshot: ModerationKyteSnapshot): SusLinkSignal[] {
  const hits: SusLinkSignal[] = [];
  for (const link of snapshot.links) {
    const blocklisted = urlIsBlocklisted(link.url);
    if (blocklisted) {
      hits.push({ url: link.url, pattern: `blocklist:${blocklisted}` });
      continue;
    }
    const lookalike = urlIsLookalike(link.url);
    if (lookalike) {
      hits.push({ url: link.url, pattern: lookalike });
      continue;
    }
    const shortenerOrSketchy = urlIsShortenerOrSketchyTld(link.url);
    if (shortenerOrSketchy) {
      hits.push({ url: link.url, pattern: shortenerOrSketchy });
    }
  }
  return hits;
}

function checkRedirect(
  snapshot: ModerationKyteSnapshot,
): { url: string; pattern: string } | null {
  if (!snapshot.redirectUrl) return null;
  const blocklisted = urlIsBlocklisted(snapshot.redirectUrl);
  if (blocklisted) return { url: snapshot.redirectUrl, pattern: `blocklist:${blocklisted}` };
  const lookalike = urlIsLookalike(snapshot.redirectUrl);
  if (lookalike) return { url: snapshot.redirectUrl, pattern: lookalike };
  const shortenerOrSketchy = urlIsShortenerOrSketchyTld(snapshot.redirectUrl);
  if (shortenerOrSketchy) return { url: snapshot.redirectUrl, pattern: shortenerOrSketchy };
  return null;
}

function checkEmailMismatch(
  snapshot: ModerationKyteSnapshot,
  nameHit: { keyword: string } | null,
): { domain: string; reason: string } | null {
  if (!nameHit || !snapshot.ownerEmailDomain) return null;
  if (FREE_EMAIL_DOMAINS.has(snapshot.ownerEmailDomain.toLowerCase())) {
    return {
      domain: snapshot.ownerEmailDomain,
      reason: `account uses free-mail provider while impersonating brand keyword "${nameHit.keyword}"`,
    };
  }
  return null;
}

export function runDeterministicChecks(
  snapshot: ModerationKyteSnapshot,
  publishSeq: number,
): ModerationVerdictResult | null {
  const nameHit = checkNameImpersonation(snapshot);
  const linkHits = checkLinkPatterns(snapshot);
  const redirectHit = checkRedirect(snapshot);
  const emailHit = checkEmailMismatch(snapshot, nameHit);

  if (!nameHit && linkHits.length === 0 && !redirectHit) {
    return null;
  }

  const signals: ModerationSignals = { publishSeq };
  const categories: string[] = [];

  if (nameHit) {
    signals.sus_name = { field: nameHit.field, value: nameHit.value, keyword: nameHit.keyword };
    categories.push("brand_impersonation");
  }
  if (linkHits.length > 0) {
    signals.sus_link = linkHits;
    categories.push("malicious_link");
  }
  if (redirectHit) {
    signals.sus_redirect = redirectHit;
    categories.push("malicious_redirect");
  }
  if (emailHit) {
    signals.sus_email = emailHit;
    categories.push("email_mismatch");
  }

  const reasonParts = [
    nameHit && `name/description matched brand keyword "${nameHit.keyword}"`,
    linkHits.length > 0 && `${linkHits.length} link(s) matched a malicious pattern`,
    redirectHit && `redirect target matched pattern "${redirectHit.pattern}"`,
  ].filter((part): part is string => Boolean(part));

  return {
    verdict: "SUSPEND",
    categories,
    confidence: 1,
    reason: `Deterministic pre-check hit: ${reasonParts.join("; ")}.`,
    provider: "deterministic",
    signals,
  };
}
