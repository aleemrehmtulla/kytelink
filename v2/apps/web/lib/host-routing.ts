// Pure host-routing decision logic for the edge middleware. Kept free of
// `next/server` so it can be unit-tested directly.

export const PRIMARY_HOSTS = new Set([
  "kytelink.com",
  "www.kytelink.com",
  "localhost:3000",
  "localhost:4000",
  "127.0.0.1:3000",
]);

// Founder-owned short domains. Legacy parity (rewrite/01-parity.md §5): the root
// path redirects to the kytelink.com apex; any other path is a username alias and
// serves that profile. All four stay functional in middleware; only kyte.bio and
// kyte.lol are communicated in product UI (ShareKyteModal).
const VANITY_DOMAINS = new Set(["kyte.bio", "kyte.lol", "yoyo.so", "downsad.com"]);

export function normalizeHost(host: string): string {
  return host
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export function isVanityHost(host: string): boolean {
  return VANITY_DOMAINS.has(normalizeHost(host));
}

// Result of a custom-domain owner lookup. `ok:false` means the lookup itself
// failed (network error / timeout / non-200) — distinct from a successful lookup
// that returned no owner (`ok:true, username:null`).
export type HostLookup = { ok: true; username: string | null } | { ok: false };

export type ForeignHostDecision =
  | { kind: "redirect-landing" }
  | { kind: "serve-path" }
  | { kind: "rewrite-profile"; username: string };

// Decide how to route a request whose host is neither a primary host nor already
// handled. `cachedUsername` is the last successfully-resolved owner for this host
// (module-level cache in the middleware); it powers the fail-OPEN path so a brief
// API hiccup keeps serving the profile instead of bouncing the whole domain away.
export function decideForeignHost(opts: {
  host: string;
  isRoot: boolean;
  lookup: HostLookup;
  cachedUsername: string | null;
}): ForeignHostDecision {
  if (isVanityHost(opts.host)) {
    return opts.isRoot ? { kind: "redirect-landing" } : { kind: "serve-path" };
  }

  if (opts.lookup.ok) {
    if (opts.lookup.username) return { kind: "rewrite-profile", username: opts.lookup.username };
    return { kind: "redirect-landing" };
  }

  // Lookup failed — fail OPEN to the last-known owner rather than redirecting away.
  if (opts.cachedUsername) return { kind: "rewrite-profile", username: opts.cachedUsername };
  return { kind: "redirect-landing" };
}
