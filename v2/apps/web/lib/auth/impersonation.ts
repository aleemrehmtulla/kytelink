import { isMockApi } from "../api/client";
import { publicApiUrl } from "../env";

export interface Impersonation {
  userId: string;
  email: string;
  readOnly: boolean;
  expiresAt: string;
  adminEmail: string;
}

interface StatusResponse {
  active?: boolean;
  readOnly?: boolean;
  expiresAt?: string;
  adminEmail?: string;
  user?: { id?: string; email?: string };
}

/**
 * An admin viewing this account is a property of the browser's cookies, not of
 * anything this app stores — so it is asked for on boot and never cached.
 * Resolves to null on any failure: a broken probe must never imply a session.
 */
export async function probeImpersonation(): Promise<Impersonation | null> {
  if (isMockApi()) return null;
  try {
    const response = await fetch(`${publicApiUrl()}/auth/impersonate/status`, {
      credentials: "include",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as StatusResponse | null;
    if (!data?.active || !data.user?.id || !data.user.email || !data.expiresAt) return null;
    return {
      userId: data.user.id,
      email: data.user.email,
      readOnly: data.readOnly ?? true,
      expiresAt: data.expiresAt,
      adminEmail: data.adminEmail ?? "an administrator",
    };
  } catch {
    return null;
  }
}

export async function exitImpersonation(): Promise<void> {
  if (isMockApi()) return;
  await fetch(`${publicApiUrl()}/auth/impersonate/stop`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
}
