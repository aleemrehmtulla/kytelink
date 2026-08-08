import type { ApiConfig } from "../config";

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * True when the API is hosted under kytelink.com, which is the only case where
 * auth cookies are widened to `.kytelink.com` so admin/web/api share them.
 * Owned here rather than inline in auth.ts because the impersonation cookie
 * must be scoped identically — a mismatch and it silently never arrives.
 */
export function isCrossSubdomainAuth(config: ApiConfig): boolean {
  return safeHost(config.apiBaseUrl)?.endsWith("kytelink.com") ?? false;
}

export interface AuthCookieScope {
  domain?: string;
  secure: boolean;
}

export function authCookieScope(config: ApiConfig): AuthCookieScope {
  const crossSubdomain = isCrossSubdomainAuth(config);
  return crossSubdomain ? { domain: ".kytelink.com", secure: true } : { secure: false };
}
