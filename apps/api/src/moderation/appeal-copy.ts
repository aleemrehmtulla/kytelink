import { APPEAL_PATH, type AppealKind } from "@kytelink/schemas";
import { getConfig } from "../config";

/**
 * Appeals are hosted in the landing zone next to /report, so the link works for
 * someone who cannot reach the app at all. Falls back to the web base URL on a
 * deployment that runs no separate landing zone.
 */
export function appealUrl(params?: { kind?: AppealKind; handle?: string | null }): string {
  const config = getConfig();
  const url = new URL(APPEAL_PATH, config.landingOrigin ?? config.webBaseUrl);
  if (params?.kind) url.searchParams.set("kind", params.kind);
  if (params?.handle) url.searchParams.set("handle", params.handle);
  return url.toString();
}

function withReason(lead: string, reason: string | null, appeal: string): string {
  const why = reason ? ` Reason on file: ${reason}.` : "";
  return `${lead}${why} You can appeal at ${appeal}.`;
}

export function suspendedKyteMessage(reason: string | null, handle?: string | null): string {
  return withReason(
    "This kyte is suspended, so it is read-only.",
    reason,
    appealUrl({ kind: "kyte", handle }),
  );
}

export function suspendedOrgMessage(reason: string | null, orgId: string): string {
  return withReason(
    "This organization is suspended, so everything in it is read-only.",
    reason,
    appealUrl({ kind: "org", handle: orgId }),
  );
}

// No handle: the account identifier is an email address, and a link that
// carries one leaks it into referrers and logs. The form asks for it instead.
export function suspendedAccountMessage(reason: string | null): string {
  return withReason(
    "Your account is suspended, so it is read-only. You can still sign in and read everything.",
    reason,
    appealUrl({ kind: "user" }),
  );
}
