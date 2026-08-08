import { lookup as dnsLookup } from "node:dns/promises";
import type { IncomingMessage } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest, type RequestOptions } from "node:https";
import { isIP, type LookupFunction } from "node:net";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;

export class SsrfError extends Error {}

interface PinnedAddress {
  address: string;
  family: number;
}

export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const parts = ip.split(".").map((n) => Number.parseInt(n, 10));
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }
  const normalized = ip.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — validate the embedded v4 address.
    const mapped = normalized.slice("::ffff:".length);
    if (isIP(mapped) === 4) return isPrivateIp(mapped);
    return true;
  }
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  );
}

// `new URL("http://[::1]/").hostname` keeps the brackets; strip them before any
// IP check so IPv6 literals like [::1] are recognised and rejected (S7).
export function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

// Resolve the hostname ONCE, validate the address, and return it so the actual
// connection can be pinned to it — closing the DNS-rebinding TOCTOU where fetch
// would otherwise re-resolve the name to a private address after validation.
async function resolvePinnedAddress(hostname: string): Promise<PinnedAddress> {
  const host = stripBrackets(hostname);
  const literalFamily = isIP(host);
  if (literalFamily !== 0) {
    if (isPrivateIp(host)) throw new SsrfError("Refusing to fetch a private address.");
    return { address: host, family: literalFamily };
  }
  const lowered = host.toLowerCase();
  if (lowered === "localhost" || lowered.endsWith(".local") || lowered.endsWith(".internal")) {
    throw new SsrfError("Refusing to fetch an internal hostname.");
  }
  const records = await dnsLookup(host, { all: true });
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new SsrfError("Refusing to fetch a host that resolves to a private address.");
    }
  }
  const chosen = records[0];
  if (!chosen) throw new SsrfError("Host did not resolve to any address.");
  return { address: chosen.address, family: chosen.family };
}

function pinnedLookup(pinned: PinnedAddress): LookupFunction {
  return ((_hostname: string, options: unknown, callback: unknown): void => {
    const wantsAll =
      typeof options === "object" && options !== null && (options as { all?: boolean }).all === true;
    if (wantsAll) {
      (callback as (err: null, addresses: PinnedAddress[]) => void)(null, [pinned]);
    } else {
      (callback as (err: null, address: string, family: number) => void)(
        null,
        pinned.address,
        pinned.family,
      );
    }
  }) as unknown as LookupFunction;
}

interface RawResult {
  status: number;
  location: string | null;
  body: Buffer | null;
}

function requestOnce(rawUrl: string, pinned: PinnedAddress): Promise<RawResult> {
  return new Promise<RawResult>((resolve, reject) => {
    const url = new URL(rawUrl);
    const requester = url.protocol === "https:" ? httpsRequest : httpRequest;
    // servername defaults to url.hostname (so TLS validates against the real
    // host), while `lookup` forces the socket to the pre-validated IP.
    const options: RequestOptions = {
      method: "GET",
      lookup: pinnedLookup(pinned),
      headers: { "user-agent": "KytelinkImporter/1.0" },
    };
    const req = requester(url, options, (res: IncomingMessage) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        res.resume();
        resolve({ status, location: res.headers.location ?? null, body: null });
        return;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      res.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_BYTES) {
          req.destroy();
          reject(new SsrfError("Response exceeds the 2MB limit."));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => resolve({ status, location: null, body: Buffer.concat(chunks) }));
      res.on("error", (err) => reject(new SsrfError(`Fetch failed: ${err.message}`)));
    });
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new SsrfError("Upstream timed out."));
    });
    req.on("error", (err) =>
      reject(err instanceof SsrfError ? err : new SsrfError(`Fetch failed: ${err.message}`)),
    );
    req.end();
  });
}

export async function ssrfSafeFetchText(rawUrl: string): Promise<string> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const url = new URL(current);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new SsrfError("Only http and https URLs are allowed.");
    }
    const pinned = await resolvePinnedAddress(url.hostname);
    const result = await requestOnce(current, pinned);

    if (result.status >= 300 && result.status < 400) {
      if (!result.location) throw new SsrfError("Redirect without a location header.");
      current = new URL(result.location, url).toString();
      continue;
    }
    if (result.status < 200 || result.status >= 300 || !result.body) {
      throw new SsrfError(`Upstream returned ${result.status}.`);
    }
    return result.body.toString("utf8");
  }
  throw new SsrfError("Too many redirects.");
}
