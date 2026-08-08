const BRAND_DOMAIN_TOKENS = [
  "bell",
  "rogers",
  "telus",
  "verizon",
  "paypal",
  "chase",
  "hsbc",
  "rbc",
  "scotiabank",
  "bmo",
  "citibank",
  "barclays",
  "revolut",
  "fedex",
  "amazon",
  "coinbase",
  "binance",
  "kraken",
  "metamask",
] as const;

const HOMOGLYPH_MAP: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

function normalizeHomoglyphs(label: string): string {
  const substituted = label
    .toLowerCase()
    .split("")
    .map((char) => HOMOGLYPH_MAP[char] ?? char)
    .join("");
  return substituted.replace(/rn/g, "m").replace(/vv/g, "w");
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i]![0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0]![j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  return matrix[rows - 1]![cols - 1]!;
}

export function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isPunycodeHost(hostname: string): boolean {
  return hostname.split(".").some((label) => label.startsWith("xn--"));
}

export function findBrandLookalikeToken(hostname: string): string | null {
  const labels = hostname.split(".").filter((label) => !isPunycodeHost(label) && label.length > 2);
  for (const label of labels) {
    const normalized = normalizeHomoglyphs(label);
    for (const brand of BRAND_DOMAIN_TOKENS) {
      if (label === brand) continue;
      if (normalized === brand) return brand;
      const distance = levenshtein(normalized, brand);
      if (distance > 0 && distance <= 1 && Math.abs(normalized.length - brand.length) <= 2) {
        return brand;
      }
    }
  }
  return null;
}
