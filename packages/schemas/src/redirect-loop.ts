// Exported as its own subpath for the edge middleware; everything here must
// stay free of zod imports, directly or transitively.

export const KYTELINK_APEX_HOST = "kytelink.com";

// Founder-owned short domains that serve any non-root path as a username alias.
export const VANITY_PROFILE_HOSTS = ["kyte.bio", "kyte.lol", "yoyo.so", "downsad.com"] as const;

const PROFILE_HOSTS: ReadonlySet<string> = new Set<string>([
  KYTELINK_APEX_HOST,
  ...VANITY_PROFILE_HOSTS,
]);

const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function normalizeProfileHost(host: string): string {
  return host
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export function isKytelinkProfileHost(host: string): boolean {
  return PROFILE_HOSTS.has(normalizeProfileHost(host));
}

function parseRedirect(redirectUrl: string): URL | null {
  const trimmed = redirectUrl.trim();
  if (trimmed === "") return null;
  try {
    return new URL(SCHEME_RE.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

export function redirectTargetHost(redirectUrl: string): string | null {
  const url = parseRedirect(redirectUrl);
  return url ? normalizeProfileHost(url.host) : null;
}

function firstPathSegment(pathname: string): string | null {
  const raw = pathname.split("/").find((segment) => segment !== "");
  if (raw === undefined) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function hostsIncludeRedirectTarget(hosts: string[], redirectUrl: string): boolean {
  const target = redirectTargetHost(redirectUrl);
  if (!target) return false;
  return hosts.some((host) => normalizeProfileHost(host) === target);
}

// True when the redirectUrl resolves back to this kyte's own profile on a Kytelink-controlled host.
export function isSelfRedirect(input: { redirectUrl: string; username: string }): boolean {
  const url = parseRedirect(input.redirectUrl);
  if (!url || !isKytelinkProfileHost(url.host)) return false;
  const segment = firstPathSegment(url.pathname);
  if (segment === null) return false;
  return segment.toLowerCase() === input.username.trim().toLowerCase();
}
