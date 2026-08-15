import type { ProfileContent } from "@kytelink/schemas";
import { getCdnUrl } from "@kytelink/cdn";

/**
 * Admin views never read user media off the public CDN: suspending a kyte
 * moves its objects to the blocked q/ prefix while Asset.key stays canonical,
 * so CDN URLs 404 for exactly the pages a reviewer must see. The API's
 * admin-only /admin/assets/file route serves the bytes from u/ or q/,
 * whichever currently holds them.
 */
export function adminAssetUrl(
  apiBaseUrl: string,
  key: string,
  options?: { lqip?: boolean },
): string {
  const params = new URLSearchParams({ key });
  if (options?.lqip) params.set("lqip", "1");
  return `${apiBaseUrl}/admin/assets/file?${params.toString()}`;
}

// Only this deployment's own CDN URLs are rewritten: an external image that
// happens to live under some other host's /u/ path must pass through untouched.
function cdnOrigin(): string | null {
  try {
    return new URL(getCdnUrl("u/probe/probe")).origin;
  } catch {
    return null;
  }
}

function userMediaKeyOf(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.origin !== cdnOrigin()) return null;
  if (!parsed.pathname.startsWith("/u/")) return null;
  try {
    return decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    return null;
  }
}

/**
 * Link thumbnails store absolute CDN URLs in `link.emoji` at save time, so
 * unlike the avatar they can't be rebuilt from an Asset row — the u/ key is
 * recovered from the URL itself and pointed at the admin proxy instead.
 */
export function adminProxiedContent(
  content: ProfileContent,
  apiBaseUrl: string,
): ProfileContent {
  return {
    ...content,
    links: content.links.map((link) => {
      if (!link.emoji || !link.emoji.includes("://")) return link;
      const key = userMediaKeyOf(link.emoji);
      return key ? { ...link, emoji: adminAssetUrl(apiBaseUrl, key) } : link;
    }),
  };
}
