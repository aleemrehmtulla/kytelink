import { createHash } from "node:crypto";

// Daily rotating salt (the UTC calendar date) keeps ip_hash stable within a
// day for approximate-unique counting but unlinkable across days — raw IPs
// are never stored (doc 07).
function dailySalt(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function hashIp(ip: string, now: Date = new Date()): string {
  return createHash("sha256").update(`${ip}:${dailySalt(now)}`).digest("hex");
}
