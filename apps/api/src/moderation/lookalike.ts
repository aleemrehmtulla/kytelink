import { domainToUnicode } from "node:url";
import { MAJOR_BRANDS, PHISH_HOST_SEGMENTS } from "./brand-keywords";

export interface BrandLookalike {
  brand: string;
  pattern: string;
}

interface BrandTarget {
  brand: string;
  label: string;
}

const HOMOGLYPH_MIN_LENGTH = 4;
const TYPOSQUAT_MIN_LENGTH = 6;

/**
 * Brand labels that are also ordinary words or names, so an added/dropped letter
 * is far likelier to be a real site (the Seattle Kraken, a spectrum clinic) than
 * a typosquat. They still get the exact-homoglyph rule.
 */
const TYPOSQUAT_EXCLUDED = new Set(["spectrum", "kraken", "sprint"]);

const MULTI_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "com.au",
  "co.nz",
  "co.jp",
  "com.br",
  "co.in",
  "com.mx",
  "co.za",
]);

/** Digits, symbols, and the Cyrillic/Greek letters that render as Latin ones. */
const CONFUSABLES: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  а: "a",
  в: "b",
  е: "e",
  к: "k",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  т: "t",
  у: "y",
  х: "x",
  і: "i",
  ј: "j",
  ѕ: "s",
  ԁ: "d",
  ӏ: "l",
  ν: "v",
  ο: "o",
  ρ: "p",
  ι: "i",
  κ: "k",
  τ: "t",
  ⅼ: "l",
};

const BRAND_TARGETS: BrandTarget[] = MAJOR_BRANDS.flatMap((brand) =>
  brand.domains.flatMap((domain) => {
    const label = domain.split(".")[0] ?? "";
    const collapsed = label.replace(/[^a-z0-9]/g, "");
    const labels = collapsed === label ? [label] : [label, collapsed];
    return labels.map((value) => ({ brand: brand.name, label: value }));
  }),
);

function normalizeConfusables(value: string): string {
  const substituted = value
    .toLowerCase()
    .split("")
    .map((char) => CONFUSABLES[char] ?? char)
    .join("");
  return substituted.replace(/rn/g, "m").replace(/vv/g, "w");
}

/** True when one string is the other with exactly one character inserted. */
function isInsertionTypo(shorter: string, longer: string): boolean {
  if (longer.length - shorter.length !== 1) return false;
  let offset = 0;
  for (let index = 0; index < shorter.length; index += 1) {
    if (shorter[index] !== longer[index + offset]) {
      offset += 1;
      if (offset > 1 || shorter[index] !== longer[index + offset]) return false;
    }
  }
  return true;
}

function isTyposquat(candidate: string, target: string): boolean {
  if (candidate === target) return false;
  return candidate.length < target.length
    ? isInsertionTypo(candidate, target)
    : isInsertionTypo(target, candidate);
}

export function extractHostname(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
}

export function isPunycodeHost(hostname: string): boolean {
  return hostname.split(".").some((label) => label.startsWith("xn--"));
}

/** Punycode hides the confusable characters, so every check reads the decoded form. */
export function decodePunycodeHost(hostname: string): string {
  return isPunycodeHost(hostname) ? domainToUnicode(hostname).toLowerCase() : hostname;
}

function tldLabelCount(labels: string[]): number {
  const lastTwo = labels.slice(-2).join(".");
  return MULTI_PART_TLDS.has(lastTwo) ? 2 : 1;
}

function segmentsOf(label: string): string[] {
  return label.split(/[^\p{L}\p{N}]+/u).filter((segment) => segment.length > 0);
}

/**
 * A host is the brand's own when the registrable label *is* the brand — which
 * covers every ccTLD and every subdomain (support.amazon.co.uk) without having
 * to enumerate them.
 */
export function brandOwningHost(hostname: string): string | null {
  const labels = decodePunycodeHost(hostname).split(".");
  const registrable = labels[labels.length - tldLabelCount(labels) - 1];
  if (registrable === undefined) return null;
  const collapsed = registrable.replace(/[^a-z0-9]/g, "");
  const target = BRAND_TARGETS.find(
    (entry) => entry.label === registrable || entry.label === collapsed,
  );
  return target?.brand ?? null;
}

/**
 * High-precision only: a homoglyph respelling, a one-character typosquat, or a
 * brand label glued to a credential-capture word. A hostname that merely
 * contains a brand-ish word is not a lookalike.
 */
export function findBrandLookalike(hostname: string): BrandLookalike | null {
  if (brandOwningHost(hostname) !== null) return null;

  const decoded = decodePunycodeHost(hostname);
  const labels = decoded.split(".");
  const scanned = labels.slice(0, Math.max(labels.length - tldLabelCount(labels), 1));
  const segments = scanned.flatMap((label) => segmentsOf(label));
  const candidates = [...new Set([...scanned, ...segments])];
  const phishSegments = segments.filter((segment) => PHISH_HOST_SEGMENTS.has(segment));

  for (const candidate of candidates) {
    const normalized = normalizeConfusables(candidate);
    for (const target of BRAND_TARGETS) {
      if (normalized === target.label) {
        if (candidate !== target.label && target.label.length >= HOMOGLYPH_MIN_LENGTH) {
          return { brand: target.brand, pattern: `homoglyph_of:${target.label}` };
        }
        if (phishSegments.length > 0) {
          return { brand: target.brand, pattern: `brand_phish_host:${target.label}` };
        }
        continue;
      }
      if (
        target.label.length >= TYPOSQUAT_MIN_LENGTH &&
        !TYPOSQUAT_EXCLUDED.has(target.label) &&
        isTyposquat(normalized, target.label)
      ) {
        return { brand: target.brand, pattern: `typosquat_of:${target.label}` };
      }
    }
  }
  return null;
}
