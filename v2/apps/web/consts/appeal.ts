import { APPEAL_PATH, type AppealKind } from "@kytelink/schemas";
import { LANDING_ORIGIN } from "./landing-routes";

// The appeal form lives in the landing zone, unauthenticated, so someone who
// can't reach their account can still file one. Never pass an email in the
// query string — the form asks for it.
export function appealUrl(kind: AppealKind, handle?: string | null): string {
  const query = new URLSearchParams({ kind });
  if (handle) query.set("handle", handle);
  return `${LANDING_ORIGIN}${APPEAL_PATH}?${query.toString()}`;
}
