import { createHmac, timingSafeEqual } from "node:crypto";

export const INTERNAL_SIGNATURE_HEADER = "x-kyte-signature";
export const INTERNAL_TIMESTAMP_HEADER = "x-kyte-timestamp";
// Replay window. There is no nonce, so this is the whole of the replay defence:
// a captured signature is valid until it expires. Callers are our own SSR and
// worker processes on NTP-synced hosts, where real clock drift is milliseconds —
// 5 minutes was 10x wider than anything legitimate needs. Kept above zero because
// verification failure fails closed on the profile-render path.
const MAX_SKEW_MS = 30 * 1000;

export function signInternalRequest(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  body: string,
): string {
  const payload = `${method.toUpperCase()}\n${path}\n${timestamp}\n${body}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export type InternalVerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "timestamp" | "signature" };

export function verifyInternalRequest(
  secret: string,
  method: string,
  path: string,
  headers: { signature?: string; timestamp?: string },
  body: string,
  now: number = Date.now(),
): InternalVerifyResult {
  if (!secret || !headers.signature || !headers.timestamp) {
    return { ok: false, reason: "missing" };
  }
  const ts = Number.parseInt(headers.timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_MS) {
    return { ok: false, reason: "timestamp" };
  }
  const expected = signInternalRequest(secret, method, path, headers.timestamp, body);
  const provided = headers.signature;
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false, reason: "signature" };
  }
  return { ok: true };
}
