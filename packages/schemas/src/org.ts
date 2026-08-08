// The default (personal) org a user gets is named after them, not "Personal" —
// "Personal" reads like an account-settings section and confuses people. Prefer
// the user's full name; fall back to the email local-part, then a generic.
export function defaultOrgName(name?: string | null, email?: string | null): string {
  const full = name?.trim().replace(/\s+/g, " ");
  if (full) return `${full}'s Organization`;
  const local = email?.split("@")[0]?.trim();
  if (local) return `${local.charAt(0).toUpperCase()}${local.slice(1)}'s Organization`;
  return "My Organization";
}
