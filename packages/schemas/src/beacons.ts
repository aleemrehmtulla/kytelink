import { z } from "zod";
import { productEventSchema } from "./product-events";

export const DEVICE_TYPES = ["MOBILE", "TABLET", "DESKTOP", "UNKNOWN"] as const;
export const deviceTypeSchema = z.enum(DEVICE_TYPES);
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const pageBeaconSchema = z.object({
  kyteId: z.string().min(1),
  username: z.string().min(1),
  referrer: z.string().optional(),
});

export type PageBeacon = z.infer<typeof pageBeaconSchema>;

export const linkBeaconSchema = pageBeaconSchema.extend({
  linkUrl: z.string().min(1),
  linkTitle: z.string(),
});

export type LinkBeacon = z.infer<typeof linkBeaconSchema>;

// No userId/kyteId here on purpose: identity is resolved server-side from the
// request's session, never accepted from the beacon body, which any visitor can
// forge. anonymousId stays client-supplied — it is a pre-login correlation id
// that carries no authority.
export const eventBeaconSchema = z.object({
  event: productEventSchema,
  anonymousId: z.string().optional(),
  ref: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export type EventBeacon = z.infer<typeof eventBeaconSchema>;
