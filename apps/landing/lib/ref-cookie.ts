const REF_COOKIE_NAME = "kyte_ref";
const REF_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

// The marketing site's ONE cookie (12-landing.md, 07-analytics.md): captures
// ?ref={username} watermark attribution for 24h so a later signup_completed
// on apps/web can attribute back to the kyte whose "kyte." watermark drove
// the click. First-party, no third-party trackers.
export function captureRefFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (!ref) return null;

  document.cookie = `${REF_COOKIE_NAME}=${encodeURIComponent(ref)}; path=/; max-age=${REF_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  return ref;
}
