import { createTRPCClient, httpBatchLink, type TRPCClient } from "@trpc/client";
import type { AppRouter } from "@kytelink/trpc";
import { publicApiUrl } from "../env";

export type KytelinkTRPCClient = TRPCClient<AppRouter>;

// NOTE: `AppRouter` is imported type-only. The runtime `createKytelinkClient`
// helper lives behind the @kytelink/trpc barrel, which also evaluates the
// server router (→ @kytelink/clickhouse → node:fs/promises) — importing it here
// would drag Node-only server code into the browser bundle. Building the client
// with @trpc/client directly (mirroring that helper's tiny body) keeps the web
// bundle client-clean while preserving full end-to-end type inference.
const credentialedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, credentials: "include" });

let client: KytelinkTRPCClient | null = null;

export function getTrpcClient(): KytelinkTRPCClient {
  if (!client) {
    client = createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: `${publicApiUrl()}/trpc`, fetch: credentialedFetch })],
    });
  }
  return client;
}
