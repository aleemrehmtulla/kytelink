import { z } from "zod";

const headerValueSchema = z.union([z.string(), z.array(z.string())]);

// AnalyticsSeam.ingestBeacon takes `payload: unknown`, so this schema is the
// contract the route shell (routes/beacons.ts) must satisfy. Server-side
// enrichment (device, bot flag, country, ip_hash, rate limiting) needs the
// request's IP, user-agent and geo headers, none of which are in the
// client-sent beacon body.
export const beaconEnvelopeSchema = z.object({
  ip: z.string().min(1),
  userAgent: z.string().optional(),
  // Resolved by the route shell from the request's session cookie, never from the
  // beacon body. Absent for logged-out senders (the landing zone, public profiles).
  sessionUserId: z.string().optional(),
  headers: z
    .object({
      "cf-ipcountry": headerValueSchema.optional(),
      "x-vercel-ip-country": headerValueSchema.optional(),
    })
    .optional(),
  body: z.unknown(),
});

export type BeaconEnvelope = z.infer<typeof beaconEnvelopeSchema>;
