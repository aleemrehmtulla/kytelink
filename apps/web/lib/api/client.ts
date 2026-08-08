import type { ApiClient } from "./client-interface";
import { createMockClient } from "./mock-client";
import { createRealClient } from "./real-client";

// The real API is the default. Opt into the in-memory mock only with an explicit
// NEXT_PUBLIC_USE_MOCK_API=true (used by the mock-mode e2e projects).
export function isMockApi(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
}

export function createApiClient(getCurrentUserId: () => string): ApiClient {
  return isMockApi() ? createMockClient(getCurrentUserId) : createRealClient(getCurrentUserId);
}

export type { ApiClient };
