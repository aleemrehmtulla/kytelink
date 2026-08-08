import { describe, expect, it } from "vitest";
import { signInternalRequest, verifyInternalRequest } from "./hmac";

const SECRET = "test-internal-secret";

function signedAt(timestamp: number): { signature: string; timestamp: string } {
  const ts = String(timestamp);
  return { signature: signInternalRequest(SECRET, "GET", "/internal/profiles/a", ts, ""), timestamp: ts };
}

function verifyAt(headers: { signature: string; timestamp: string }, now: number) {
  return verifyInternalRequest(SECRET, "GET", "/internal/profiles/a", headers, "", now);
}

describe("internal HMAC", () => {
  it("accepts a freshly signed request", () => {
    const now = 1_800_000_000_000;
    expect(verifyAt(signedAt(now), now).ok).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const now = 1_800_000_000_000;
    const headers = signedAt(now);
    const result = verifyAt({ ...headers, signature: headers.signature.replace(/.$/, "0") }, now);
    expect(result).toEqual({ ok: false, reason: "signature" });
  });

  // S4 regression: there is no nonce, so the skew window IS the replay window.
  // A captured signature must stop working well inside a minute — if someone
  // widens MAX_SKEW_MS back out, this fails and they have to justify it.
  it("expires a captured signature within 60s in both directions", () => {
    const now = 1_800_000_000_000;
    const headers = signedAt(now);

    expect(verifyAt(headers, now + 60_000)).toEqual({ ok: false, reason: "timestamp" });
    expect(verifyAt(headers, now - 60_000)).toEqual({ ok: false, reason: "timestamp" });
  });

  it("still tolerates a few seconds of real clock drift between hosts", () => {
    const now = 1_800_000_000_000;
    const headers = signedAt(now);

    expect(verifyAt(headers, now + 5_000).ok).toBe(true);
    expect(verifyAt(headers, now - 5_000).ok).toBe(true);
  });

  it("rejects a request with no signature or timestamp headers", () => {
    const result = verifyInternalRequest(SECRET, "GET", "/internal/profiles/a", {}, "", Date.now());
    expect(result).toEqual({ ok: false, reason: "missing" });
  });
});
