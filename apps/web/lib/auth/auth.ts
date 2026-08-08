import { isMockApi } from "../api/client";
import { readSession, type Session } from "./session";
import {
  signInWithEmail as mockSignInWithEmail,
  signInWithPasskey as mockSignInWithPasskey,
  signInWithProvider as mockSignInWithProvider,
  type SignInResult,
} from "./mock-auth";
import {
  realCompletePasskeySignIn,
  realDevLogin,
  realProbeSession,
  realSendOtp,
  realSignOut,
  realStartProvider,
  realVerifyOtp,
} from "./auth-client";

export type { SignInResult };

export const AGENT_EMAIL = "agent@kytelink.dev";

export async function probeSession(): Promise<Session | null> {
  return isMockApi() ? readSession() : realProbeSession();
}

export async function sendOtp(email: string): Promise<void> {
  if (isMockApi()) return;
  await realSendOtp(email);
}

export async function completeOtp(email: string, otp: string): Promise<SignInResult> {
  return isMockApi() ? mockSignInWithEmail(email) : realVerifyOtp(email, otp);
}

export async function devLogin(email: string): Promise<SignInResult> {
  return isMockApi() ? mockSignInWithEmail(email) : realDevLogin(email);
}

// Real OAuth redirects the browser to the provider and resolves to null;
// mock mode signs in synchronously and returns a result.
export async function startProviderSignIn(
  provider: "google" | "github",
  callbackURL: string,
): Promise<SignInResult | null> {
  return isMockApi() ? mockSignInWithProvider(provider) : realStartProvider(provider, callbackURL);
}

// A real passkey WebAuthn assertion against the API's better-auth passkey plugin.
// Returns null (never throws) on a miss/cancel so the auth screen falls back softly
// to the other methods (05-auth). `autoFill` opts into conditional-UI autofill.
export async function completePasskeySignIn(
  options?: { autoFill?: boolean },
): Promise<SignInResult | null> {
  return isMockApi() ? mockSignInWithPasskey() : realCompletePasskeySignIn(options);
}

export async function signOut(): Promise<void> {
  if (!isMockApi()) await realSignOut();
}
