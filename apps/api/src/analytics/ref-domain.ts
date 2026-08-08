const DIRECT = "direct";
const MAX_REF_DOMAIN_LENGTH = 253;

export function resolveRefDomain(referrer: string | undefined): string {
  if (!referrer || referrer.trim().length === 0) return DIRECT;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const stripped = host.startsWith("www.") ? host.slice(4) : host;
    return stripped.length > 0 ? stripped.slice(0, MAX_REF_DOMAIN_LENGTH) : DIRECT;
  } catch {
    return DIRECT;
  }
}
