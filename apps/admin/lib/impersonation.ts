import { API_URL } from "./urls";

interface ImpersonatedUser {
  id: string;
  email: string;
  name: string | null;
}

export interface ImpersonationStatus {
  active: boolean;
  readOnly?: boolean;
  expiresAt?: string;
  adminEmail?: string;
  user?: ImpersonatedUser;
}

export interface StartImpersonationInput {
  userId: string;
  reason: string;
  readOnly: boolean;
}

export interface StartImpersonationResult {
  ok: true;
  url: string;
  expiresAt: string;
  readOnly: boolean;
  ttlMinutes: number;
  user: ImpersonatedUser;
}

// The grant lives in a cookie the API sets on the shared auth scope, so every
// call here must carry credentials — and nothing about the session is ever
// readable from JS.
async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}/auth/impersonate/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : "Something went wrong. Try again.";
    throw new Error(message);
  }
  return payload as T;
}

export function startImpersonation(input: StartImpersonationInput): Promise<StartImpersonationResult> {
  return call<StartImpersonationResult>("start", input);
}

export function stopImpersonation(): Promise<{ ok: true }> {
  return call<{ ok: true }>("stop", {});
}

export function fetchImpersonationStatus(): Promise<ImpersonationStatus> {
  return call<ImpersonationStatus>("status");
}
