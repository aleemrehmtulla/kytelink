import type { ApiClient } from "./client-interface";

// The real API is the default. Opt into the in-memory mock only with an explicit
// NEXT_PUBLIC_USE_MOCK_API=true (used by the mock-mode e2e projects).
export function isMockApi(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
}

type AsyncFn = (...args: unknown[]) => Promise<unknown>;
type ClientShape = Record<string, AsyncFn | Record<string, AsyncFn>>;

const noop = (): void => undefined;

// Lazy proxy: the real/mock client modules (~88/72KB gz) load on the first call,
// not at module scope, keeping them out of _app's shared chunk. Safe because
// every ApiClient member is an async method and nothing derefs one during
// render. Members are memoized — callers put them in effect dependency arrays.
export function createApiClient(getCurrentUserId: () => string): ApiClient {
  let pending: Promise<ClientShape> | null = null;
  const load = (): Promise<ClientShape> =>
    (pending ??= isMockApi()
      ? import("./mock-client").then((m) => m.createMockClient(getCurrentUserId) as unknown as ClientShape)
      : import("./real-client").then((m) => m.createRealClient(getCurrentUserId) as unknown as ClientShape));

  const members = new Map<string, unknown>();

  const buildMember = (name: string): unknown =>
    new Proxy(noop, {
      apply: (_target, _thisArg, args: unknown[]) =>
        load().then((client) => (client[name] as AsyncFn)(...args)),
      get: (_target, method) => {
        if (typeof method !== "string") return undefined;
        return (...args: unknown[]) =>
          load().then((client) =>
            (client[name] as Record<string, AsyncFn>)[method]!(...args),
          );
      },
    });

  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        // `then` would make the client look like a thenable to anything that
        // awaits it, which would resolve to the wrong value.
        if (typeof prop !== "string" || prop === "then") return undefined;
        if (!members.has(prop)) members.set(prop, buildMember(prop));
        return members.get(prop);
      },
    },
  ) as unknown as ApiClient;
}

export type { ApiClient };
