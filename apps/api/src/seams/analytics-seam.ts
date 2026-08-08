import type { ProductEvent, ProductEventProps } from "@kytelink/schemas";

/**
 * A union rather than a generic on purpose: a generic `trackProductEvent` call
 * inside better-auth's `databaseHooks` pushed the inference of the `auth`
 * object past the point where TypeScript can name it, and `auth.api` silently
 * degraded to a shape without the emailOTP plugin's endpoints.
 */
export type ProductEventInput = {
  [E in ProductEvent]: {
    event: E;
    userId?: string;
    kyteId?: string;
    properties?: ProductEventProps<E>;
  };
}[ProductEvent];

/**
 * The analytics seam: the /t/* beacon route calls `ingestBeacon`, which the
 * real analytics module (`src/analytics`) fulfills via `registerAnalyticsSeam`
 * at boot. Kept as a seam so the beacon route never imports ClickHouse directly.
 * `trackProductEvent` is the server-side milestone emitter on the same seam —
 * auth and the kyte router record signup/creation without pulling ClickHouse
 * into their import graph.
 */
export interface AnalyticsSeam {
  ingestBeacon(kind: "page" | "link" | "event", payload: unknown): void | Promise<void>;
  trackProductEvent(input: ProductEventInput): void;
}

let seam: AnalyticsSeam | null = null;

export function registerAnalyticsSeam(impl: AnalyticsSeam): void {
  seam = impl;
}

export function ingestBeacon(kind: "page" | "link" | "event", payload: unknown): void {
  void seam?.ingestBeacon(kind, payload);
}

export function trackProductEvent(input: ProductEventInput): void {
  seam?.trackProductEvent(input);
}
