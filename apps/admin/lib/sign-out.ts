import { API_URL, WEB_LOGIN_URL } from "./urls";
import { clearRecentDestinations } from "./recent-destinations";

export async function signOutAdmin(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/sign-out`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
  });
  if (!response.ok) {
    throw new Error(`sign-out responded with ${response.status}`);
  }
}

/**
 * A log-out button that appears to do nothing is worse than a hard redirect, so
 * every caller lands here whether or not the API call succeeded.
 */
export function leaveForLogin(): void {
  clearRecentDestinations();
  window.location.href = WEB_LOGIN_URL;
}
