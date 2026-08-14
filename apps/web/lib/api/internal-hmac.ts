import { internalApiBase } from "../env";

export const INTERNAL_SIGNATURE_HEADER = "x-kyte-signature";
export const INTERNAL_TIMESTAMP_HEADER = "x-kyte-timestamp";

// Web Crypto (available in both the Node getStaticProps runtime and the edge
// middleware runtime) so one signer serves every server-side internal call.
async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// The API signs over `${METHOD}\n${path}\n${timestamp}\n${body}` where `path`
// is the request path without the query string — mirror it exactly, including
// any percent-encoding present in the request URL.
export async function internalSignedHeaders(
  method: string,
  path: string,
  body = "",
): Promise<Record<string, string>> {
  const secret = process.env.INTERNAL_API_SECRET ?? "";
  const timestamp = Date.now().toString();
  const signature = await hmacHex(secret, `${method.toUpperCase()}\n${path}\n${timestamp}\n${body}`);
  return {
    [INTERNAL_SIGNATURE_HEADER]: signature,
    [INTERNAL_TIMESTAMP_HEADER]: timestamp,
  };
}

export async function verifyInternalSignature(
  method: string,
  path: string,
  headers: { signature?: string; timestamp?: string },
  body: string,
  maxSkewMs: number,
): Promise<boolean> {
  const secret = process.env.INTERNAL_API_SECRET ?? "";
  if (!secret || !headers.signature || !headers.timestamp) return false;
  const age = Math.abs(Date.now() - Number(headers.timestamp));
  if (!Number.isFinite(age) || age > maxSkewMs) return false;
  const expected = await hmacHex(
    secret,
    `${method.toUpperCase()}\n${path}\n${headers.timestamp}\n${body}`,
  );
  if (expected.length !== headers.signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ headers.signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function signedInternalGet(path: string, init?: RequestInit): Promise<Response> {
  const headers = await internalSignedHeaders("GET", path);
  return fetch(`${internalApiBase()}${path}`, { ...init, headers });
}
