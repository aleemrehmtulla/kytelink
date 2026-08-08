const LOCAL = "http://localhost:5002";
const REMOTE_ONLY_PREFIXES = ["u/"];

function getRemote(): string {
  return process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.kytelink.com";
}

export interface GetCdnUrlOptions {
  version?: string;
}

function isAbsoluteUrl(key: string): boolean {
  return /^https?:\/\//i.test(key);
}

function isRemoteOnlyKey(key: string): boolean {
  return REMOTE_ONLY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function withVersion(url: string, version: string | undefined): string {
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

export function getCdnUrl(key: string, opts: GetCdnUrlOptions = {}): string {
  if (isAbsoluteUrl(key)) return withVersion(key, opts.version);

  const normalizedKey = key.startsWith("/") ? key.slice(1) : key;
  const remote = getRemote();

  if (isRemoteOnlyKey(normalizedKey)) {
    return withVersion(`${remote}/${normalizedKey}`, opts.version);
  }

  const isDev = process.env.NODE_ENV !== "production";
  const base = isDev ? LOCAL : `${remote}/static`;
  return withVersion(`${base}/${normalizedKey}`, opts.version);
}
