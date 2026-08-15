import {
  CAPTURE_PATH_HINTS,
  CONTACT_LINK_HOSTS,
  FREE_EMAIL_DOMAINS,
  HIGH_ABUSE_TLDS,
  MAJOR_BRANDS,
  SUPPORT_CLAIM_TERMS,
  URL_BLOCKLIST_PATTERNS,
  URL_SHORTENERS,
  type MajorBrand,
} from "./brand-keywords";
import {
  brandOwningHost,
  decodePunycodeHost,
  extractHostname,
  findBrandLookalike,
  isPunycodeHost,
} from "./lookalike";
import type {
  AdvisorySignal,
  BrandClaim,
  DeterministicHit,
  ModerationKyteSnapshot,
  SusNameField,
} from "./types";

interface TextField {
  field: SusNameField;
  value: string;
}

interface Destination {
  url: string;
  kind: "link" | "redirect";
}

interface ImpersonationClaim {
  brand: MajorBrand;
  term: string;
  field: SusNameField;
  value: string;
}

interface CaptureVector {
  url: string;
  pattern: string;
  kind: "link" | "redirect";
}

const ADVISORY_LIMIT = 8;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/u;
const WORD_EDGE = "(?<![\\p{L}\\p{N}])";
const WORD_END = "(?![\\p{L}\\p{N}])";
// Space, dash, pipe, bullet — anything but another word.
const JOINER = "[^\\p{L}\\p{N}]{0,3}";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CLAIM_ALTERNATION = [...SUPPORT_CLAIM_TERMS]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegex)
  .join("|");

function textFieldsOf(snapshot: ModerationKyteSnapshot): TextField[] {
  const fields: TextField[] = [];
  if (snapshot.username) fields.push({ field: "username", value: snapshot.username });
  if (snapshot.displayName) fields.push({ field: "displayName", value: snapshot.displayName });
  if (snapshot.description) fields.push({ field: "description", value: snapshot.description });
  for (const link of snapshot.links) {
    if (link.title) fields.push({ field: "linkTitle", value: link.title });
  }
  return fields;
}

function destinationsOf(snapshot: ModerationKyteSnapshot): Destination[] {
  const destinations: Destination[] = snapshot.links.map((link) => ({
    url: link.url,
    kind: "link" as const,
  }));
  if (snapshot.redirectUrl) destinations.push({ url: snapshot.redirectUrl, kind: "redirect" });
  return destinations;
}

function blocklistHit(url: string): string | null {
  const normalized = url.toLowerCase();
  return URL_BLOCKLIST_PATTERNS.find((pattern) => normalized.includes(pattern)) ?? null;
}

/**
 * Impersonation intent, not brand mention: the brand name has to sit directly
 * against a claim to be that brand's support desk. "Bell Dental Clinic" and
 * "we answer support emails" both miss on purpose.
 */
function findImpersonationClaim(fields: TextField[]): ImpersonationClaim | null {
  for (const field of fields) {
    const text = field.value.toLowerCase();
    for (const brand of MAJOR_BRANDS) {
      for (const token of brand.tokens) {
        const escaped = escapeRegex(token);
        const patterns = [
          new RegExp(`${WORD_EDGE}${escaped}${JOINER}(${CLAIM_ALTERNATION})${WORD_END}`, "u"),
          new RegExp(`${WORD_EDGE}(${CLAIM_ALTERNATION})${JOINER}${escaped}${WORD_END}`, "u"),
        ];
        for (const pattern of patterns) {
          const match = pattern.exec(text);
          if (match) {
            return {
              brand,
              term: `${token} ${match[1] ?? ""}`.trim(),
              field: field.field,
              value: field.value,
            };
          }
        }
      }
    }
  }
  return null;
}

function pathLooksLikeCapture(url: string): boolean {
  try {
    const parsed = new URL(url);
    const target = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return CAPTURE_PATH_HINTS.some((hint) => target.includes(hint));
  } catch {
    return false;
  }
}

/** Where a visitor of the claimed support desk would be sent, minus the brand's own domains. */
function findCaptureVectors(
  snapshot: ModerationKyteSnapshot,
  brand: MajorBrand,
): CaptureVector[] {
  const vectors: CaptureVector[] = [];
  for (const destination of destinationsOf(snapshot)) {
    const lowered = destination.url.toLowerCase();
    if (lowered.startsWith("tel:") || lowered.startsWith("sms:")) {
      vectors.push({ url: destination.url, pattern: "contact_link", kind: destination.kind });
      continue;
    }
    const host = extractHostname(destination.url);
    if (!host) continue;
    if (CONTACT_LINK_HOSTS.has(host)) {
      vectors.push({ url: destination.url, pattern: "contact_link", kind: destination.kind });
      continue;
    }
    if (brandOwningHost(host) === brand.name) continue;
    vectors.push({
      url: destination.url,
      pattern: pathLooksLikeCapture(destination.url) ? "capture_path" : "off_brand_destination",
      kind: destination.kind,
    });
  }

  const phoneText = [snapshot.displayName, snapshot.description].filter(Boolean).join(" ");
  if (PHONE_PATTERN.test(phoneText)) {
    vectors.push({ url: "a phone number in the profile text", pattern: "phone_in_text", kind: "link" });
  }
  return vectors;
}

/**
 * A page presenting itself as a big company's support desk. This never decides
 * anything by itself: the company may genuinely be using Kytelink, and banning
 * a real brand automatically is the worst outcome available. It forces an AI
 * review — which compares the destinations against the brand's own domains —
 * and carries the evidence that review needs.
 */
export function findBrandClaim(snapshot: ModerationKyteSnapshot): BrandClaim | null {
  const claim = findImpersonationClaim(textFieldsOf(snapshot));
  if (!claim) return null;
  return {
    brand: claim.brand.name,
    sector: claim.brand.sector,
    claim: claim.term,
    field: claim.field,
    value: claim.value,
    officialDomains: [...claim.brand.domains],
    offBrandDestinations: findCaptureVectors(snapshot, claim.brand).map((vector) => ({
      url: vector.url,
      pattern: vector.pattern,
    })),
  };
}

/**
 * The two highest-precision patterns we have: a visitor-grabber service, and a
 * domain built to be read as a major brand's. Neither decides anything — they
 * are the strongest evidence the AI gets, and the AI still has to agree.
 */
export function findDeterministicHits(snapshot: ModerationKyteSnapshot): DeterministicHit[] {
  const hits: DeterministicHit[] = [];
  for (const destination of destinationsOf(snapshot)) {
    const blocked = blocklistHit(destination.url);
    if (blocked) {
      hits.push({
        rule: "ip_logger",
        pattern: `blocklist:${blocked}`,
        url: destination.url,
        kind: destination.kind,
      });
      continue;
    }
    const host = extractHostname(destination.url);
    if (!host) continue;
    const lookalike = findBrandLookalike(host);
    if (lookalike) {
      const decoded = decodePunycodeHost(host);
      hits.push({
        rule: "brand_lookalike",
        pattern: lookalike.pattern,
        url: destination.url,
        kind: destination.kind,
        brand: lookalike.brand,
        decodedHost: decoded === host ? undefined : decoded,
      });
    }
  }
  return hits;
}

/**
 * Weak context the AI gets to see and the admin case file keeps. Every key here
 * fires on plenty of legitimate profiles, so none of them may reach a verdict.
 */
export function collectAdvisorySignals(snapshot: ModerationKyteSnapshot): AdvisorySignal[] {
  const advisory: AdvisorySignal[] = [];
  const fields = textFieldsOf(snapshot);
  const corpus = fields.map((field) => field.value.toLowerCase()).join(" • ");
  const brandClaim = findBrandClaim(snapshot);

  if (brandClaim) {
    advisory.push({
      key: "brand_claim",
      detail: `presents itself as ${brandClaim.brand} support ("${brandClaim.claim}") — verify against ${brandClaim.officialDomains.join(", ")}`,
    });
  } else {
    for (const brand of MAJOR_BRANDS) {
      const mentioned = brand.tokens.find((token) =>
        new RegExp(`${WORD_EDGE}${escapeRegex(token)}${WORD_END}`, "u").test(corpus),
      );
      if (mentioned) {
        advisory.push({ key: "brand_mention", detail: `${brand.name} named in profile text` });
        break;
      }
    }
  }

  const supportTerm = SUPPORT_CLAIM_TERMS.find((term) =>
    new RegExp(`${WORD_EDGE}${escapeRegex(term)}${WORD_END}`, "u").test(corpus),
  );
  if (supportTerm) {
    advisory.push({ key: "support_language", detail: `profile text uses "${supportTerm}"` });
  }

  for (const destination of destinationsOf(snapshot)) {
    const host = extractHostname(destination.url);
    if (!host) continue;
    if (URL_SHORTENERS.has(host)) {
      advisory.push({ key: "url_shortener", detail: `${destination.kind} via ${host}` });
    }
    const tld = host.split(".").pop();
    if (tld && HIGH_ABUSE_TLDS.has(tld)) {
      advisory.push({ key: "high_abuse_tld", detail: `${destination.kind} on .${tld}` });
    }
    if (isPunycodeHost(host)) {
      advisory.push({ key: "punycode_host", detail: `${destination.kind} host ${host}` });
    }
  }

  if (snapshot.ownerEmailDomain && FREE_EMAIL_DOMAINS.has(snapshot.ownerEmailDomain.toLowerCase())) {
    advisory.push({
      key: "free_mail_owner",
      detail: `owner signed up with ${snapshot.ownerEmailDomain}`,
    });
  }

  return advisory.slice(0, ADVISORY_LIMIT);
}
