import type { PageBeacon, LinkBeacon, ProductEvent } from "@kytelink/schemas";

function beaconBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

function send(path: string, payload: unknown): void {
  if (typeof navigator === "undefined") return;
  const url = `${beaconBase()}${path}`;
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(url, blob);
      return;
    }
    void fetch(url, { method: "POST", body: blob, keepalive: true });
  } catch {
    // beacons never block or throw
  }
}

export function sendPageBeacon(payload: PageBeacon): void {
  send("/t/page", payload);
}

export function sendLinkBeacon(payload: LinkBeacon): void {
  send("/t/link", payload);
}

export function sendEventBeacon(event: ProductEvent, properties?: Record<string, unknown>): void {
  send("/t/event", { event, properties });
}
