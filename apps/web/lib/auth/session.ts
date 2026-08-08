import type { UserStatus } from "@kytelink/schemas";

export interface Session {
  userId: string;
  email: string;
  // A SUSPENDED account still signs in and still reads — only mutations are
  // refused (ACCOUNT_SUSPENDED), so the person can find the reason and appeal.
  status: UserStatus;
  statusReason: string | null;
}

const STORAGE_KEY = "kl_session";

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "userId" in parsed &&
      "email" in parsed &&
      typeof (parsed as Session).userId === "string"
    ) {
      const stored = parsed as Partial<Session> & { userId: string; email: string };
      return {
        userId: stored.userId,
        email: stored.email,
        status: stored.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
        statusReason: stored.statusReason ?? null,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function writeSession(session: Session | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(session.userId)}; path=/; max-age=2592000; samesite=lax`;
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${STORAGE_KEY}=; path=/; max-age=0`;
  }
}
