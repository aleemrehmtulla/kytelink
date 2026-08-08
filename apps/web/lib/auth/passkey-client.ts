import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { publicApiUrl } from "../env";

let client: ReturnType<typeof buildClient> | null = null;

function buildClient() {
  return createAuthClient({
    baseURL: `${publicApiUrl()}/auth`,
    fetchOptions: { credentials: "include" },
    plugins: [passkeyClient()],
  });
}

// Shares the session cookie with the raw-fetch auth layer (credentials: include).
// The better-auth passkey plugin owns the WebAuthn ceremony: it fetches the
// challenge options from the live endpoints, drives navigator.credentials
// get()/create(), and POSTs the assertion back to verify — minting the session.
export function getPasskeyAuthClient(): ReturnType<typeof buildClient> {
  client ??= buildClient();
  return client;
}
