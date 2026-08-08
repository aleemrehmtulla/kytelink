import type { EventBeacon, GetStartedSurface } from "@kytelink/schemas";
import { API_ORIGIN } from "./env";

// Fire-and-forget internal-analytics beacons only (12-landing.md): hit_landing
// and clicked_get_started via /t/event. Never awaited, never blocks
// navigation (15-performance.md). Landing never fires page/link hit beacons
// (those belong to the public profile page in apps/web).
function postEvent(body: EventBeacon): void {
  if (typeof window === "undefined") return;
  const url = `${API_ORIGIN}/t/event`;
  const payload = JSON.stringify(body);

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon(url, blob);
    if (sent) return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

// Path only — never the query string. `?ref=` is the one parameter that
// matters and it travels as its own field; everything else a visitor might
// carry in a URL is none of our business.
export function trackHitLanding(path: string, ref?: string): void {
  postEvent({
    event: "hit_landing",
    ref,
    properties: { path: path.slice(0, 200), ...(ref ? { ref } : {}) },
  });
}

export function trackClickedGetStarted(surface: GetStartedSurface): void {
  postEvent({ event: "clicked_get_started", properties: { surface } });
}
