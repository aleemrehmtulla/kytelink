import { z } from "zod";
import {
  auditActionSchema,
  moderationStatusSchema,
  roleSchema,
  kyteAccessSchema,
  themeKeySchema,
} from "@kytelink/schemas";

export const okSchema = z.object({ ok: z.literal(true) });

export const kyteIdInput = z.object({ kyteId: z.string().min(1) });
export const orgIdInput = z.object({ orgId: z.string().min(1) });

const kyteSummarySchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  theme: themeKeySchema,
  published: z.boolean(),
  moderationStatus: moderationStatusSchema,
  effectiveRole: roleSchema.nullable(),
});

export const orgSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  personal: z.boolean(),
  role: roleSchema,
  kyteAccess: kyteAccessSchema,
  ownerUserId: z.string(),
  kytes: z.array(kyteSummarySchema),
});

export const orgStorageSchema = z.object({
  usedBytes: z.number(),
  limitBytes: z.number(),
  kytes: z.array(
    z.object({
      kyteId: z.string(),
      displayName: z.string().nullable(),
      bytes: z.number(),
    }),
  ),
});

export const auditEntrySchema = z.object({
  id: z.string(),
  action: auditActionSchema,
  actorUserId: z.string(),
  actorEmail: z.string().nullable(),
  orgId: z.string().nullable(),
  kyteId: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export const memberSchema = z.object({
  membershipId: z.string(),
  userId: z.string(),
  email: z.string(),
  role: roleSchema,
  kyteAccess: kyteAccessSchema,
  kyteGrants: z.array(z.object({ kyteId: z.string(), role: roleSchema })),
});

export const analyticsWindowInput = z.object({
  kyteId: z.string().min(1),
  days: z.number().int().min(1).max(90).default(30),
});
