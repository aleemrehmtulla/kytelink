import { publicApiUrl } from "../env";
import { getTrpcClient } from "../api/trpc";
import { getPasskeyAuthClient } from "./passkey-client";
import type { Session } from "./session";
import type { SignInResult } from "./mock-auth";

function authBase(): string {
  return `${publicApiUrl()}/auth`;
}

async function authPost(path: string, body?: unknown): Promise<Response> {
  return fetch(`${authBase()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface SessionResponse {
  session?: { userId?: string } | null;
  // `status`/`statusReason` are account-standing columns better-auth passes
  // straight through; read defensively so a payload without them is ACTIVE
  // rather than broken.
  user?: { email?: string; status?: string; statusReason?: string | null } | null;
}

export async function realProbeSession(): Promise<Session | null> {
  try {
    const res = await fetch(`${authBase()}/get-session`, { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as SessionResponse | null;
    if (!data?.session?.userId || !data.user?.email) return null;
    return {
      userId: data.session.userId,
      email: data.user.email,
      status: data.user.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
      statusReason: data.user.statusReason ?? null,
    };
  } catch {
    return null;
  }
}

async function needsOnboarding(): Promise<boolean> {
  try {
    const { orgs } = await getTrpcClient().org.listMine.query();
    return !orgs.some((org) => org.kytes.length > 0);
  } catch {
    return true;
  }
}

async function buildResult(): Promise<SignInResult> {
  const session = await realProbeSession();
  if (!session) throw new Error("Sign in didn't complete. Please try again.");
  return { session, needsOnboarding: await needsOnboarding() };
}

export async function realSendOtp(email: string): Promise<void> {
  const res = await authPost("/email-otp/send-verification-otp", {
    email: email.trim().toLowerCase(),
    type: "sign-in",
  });
  if (!res.ok) throw new Error("Couldn't send a code to that email.");
}

export async function realVerifyOtp(email: string, otp: string): Promise<SignInResult> {
  const res = await authPost("/sign-in/email-otp", { email: email.trim().toLowerCase(), otp });
  if (!res.ok) throw new Error("That code isn't right or has expired.");
  return buildResult();
}

export async function realDevLogin(email: string): Promise<SignInResult> {
  const res = await authPost("/dev-login", { email: email.trim().toLowerCase() });
  if (!res.ok) throw new Error("Dev login is unavailable.");
  return buildResult();
}

export async function realStartProvider(
  provider: "google" | "github",
  callbackURL: string,
): Promise<null> {
  const res = await authPost("/sign-in/social", { provider, callbackURL });
  if (res.ok) {
    const data = (await res.json()) as { url?: string };
    if (data.url) {
      window.location.href = data.url;
      return null;
    }
  }
  throw new Error("Couldn't start sign-in with that provider.");
}

// Login-only entry: run the WebAuthn assertion ceremony (generate-authenticate-options
// → navigator.credentials.get() → verify-authentication) which mints the session cookie.
// A cancelled prompt, no local credential, or any verify failure resolves to null so the
// auth screen can fall back to the other methods instead of dead-ending (doc 05).
export async function realCompletePasskeySignIn(
  options?: { autoFill?: boolean },
): Promise<SignInResult | null> {
  try {
    const result = await getPasskeyAuthClient().signIn.passkey(options);
    if (!result || result.error || !result.data) return null;
    return await buildResult();
  } catch {
    return null;
  }
}

// Post-signup registration: generate-register-options → navigator.credentials.create()
// → verify-registration, binding a new passkey to the signed-in user.
export async function realRegisterPasskey(name: string): Promise<void> {
  const result = await getPasskeyAuthClient().passkey.addPasskey({ name });
  if (result?.error) {
    throw new Error(result.error.message ?? "Couldn't add a passkey. Please try again.");
  }
}

export async function realSignOut(): Promise<void> {
  try {
    await authPost("/sign-out");
  } catch {
    // best-effort — local state is cleared regardless
  }
}
