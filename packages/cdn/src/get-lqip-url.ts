import { getCdnUrl, type GetCdnUrlOptions } from "./get-cdn-url";

function isAbsoluteUrl(key: string): boolean {
  return /^https?:\/\//i.test(key);
}

/** An asset's LQIP sibling is the same key with `.lqip` before the extension. */
export function getLqipUrl(key: string, opts: GetCdnUrlOptions = {}): string {
  if (isAbsoluteUrl(key)) return getCdnUrl(key, opts);

  const lastDot = key.lastIndexOf(".");
  const lqipKey =
    lastDot === -1 ? `${key}.lqip` : `${key.slice(0, lastDot)}.lqip${key.slice(lastDot)}`;

  return getCdnUrl(lqipKey, opts);
}
