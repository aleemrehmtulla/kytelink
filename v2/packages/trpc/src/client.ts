import {
  createTRPCClient,
  httpBatchLink,
  type CreateTRPCClientOptions,
  type TRPCClient,
} from "@trpc/client";
import type { AppRouter } from "./app-router";

interface KytelinkClientOptions {
  url: string;
  headers?: Record<string, string> | (() => Record<string, string>);
  fetch?: typeof fetch;
}

export type KytelinkTRPCClient = TRPCClient<AppRouter>;

export function createKytelinkClient(opts: KytelinkClientOptions): KytelinkTRPCClient {
  const config: CreateTRPCClientOptions<AppRouter> = {
    links: [
      httpBatchLink({
        url: opts.url,
        headers: opts.headers,
        fetch: opts.fetch,
      }),
    ],
  };
  return createTRPCClient<AppRouter>(config);
}
