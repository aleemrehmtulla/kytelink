import { createTRPCClient, httpBatchLink, type TRPCClient } from "@trpc/client";
import type { AppRouter } from "@kytelink/trpc";

export type AdminTRPCClient = TRPCClient<AppRouter>;

let client: AdminTRPCClient | null = null;

function apiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3003"
  );
}

/**
 * Real browser client against the running apps/api. Built directly on
 * `@trpc/client` with only the `AppRouter` *type* imported from `@kytelink/trpc`
 * (erased at build) — importing the package's runtime barrel would evaluate the
 * server `appRouter` and pull Node-only modules into the browser bundle. Calls
 * carry the shared better-auth cookie (`credentials: "include"`) so
 * `adminProcedure` enforces `role === ADMIN` + ADMIN_EMAILS on every request.
 */
export function getAdminTrpcClient(): AdminTRPCClient {
  if (client) return client;
  client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${apiBaseUrl()}/trpc`,
        fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
      }),
    ],
  });
  return client;
}
