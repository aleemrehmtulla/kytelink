import { ensureUserByEmail, userHasAnyKyte } from "../api/mock-client";
import type { Session } from "./session";

export interface SignInResult {
  session: Session;
  needsOnboarding: boolean;
}

function mockSession(userId: string, email: string): Session {
  return { userId, email, status: "ACTIVE", statusReason: null };
}

export function signInWithEmail(email: string): SignInResult {
  const normalized = email.trim().toLowerCase();
  const { userId } = ensureUserByEmail(normalized);
  return {
    session: mockSession(userId, normalized),
    needsOnboarding: !userHasAnyKyte(userId),
  };
}

export function signInWithProvider(provider: "google" | "github"): SignInResult {
  const email = provider === "google" ? "agent@kytelink.dev" : "agent@kytelink.dev";
  const { userId } = ensureUserByEmail(email);
  return {
    session: mockSession(userId, email),
    needsOnboarding: !userHasAnyKyte(userId),
  };
}

export function signInWithPasskey(): SignInResult | null {
  const email = "agent@kytelink.dev";
  const { userId } = ensureUserByEmail(email);
  return { session: mockSession(userId, email), needsOnboarding: !userHasAnyKyte(userId) };
}
