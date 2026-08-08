import { z } from "zod";
import { kyteAccessSchema, roleSchema, ROLE_RANK } from "./roles";

export const INVITE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "REVOKED",
  "EXPIRED",
] as const;

export const inviteStatusSchema = z.enum(INVITE_STATUSES);
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const INVITE_EXPIRY_DAYS = 14;

export const kyteGrantSchema = z.object({
  kyteId: z.string().min(1),
  role: roleSchema.refine((role) => ROLE_RANK[role] <= ROLE_RANK.MANAGER, {
    message: "Per-kyte grant roles must be MANAGER, EDITOR, or VIEWER",
  }),
});

export const orgInvitePayloadSchema = z
  .object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    role: roleSchema.refine((role) => role !== "OWNER", {
      message: "OWNER is never grantable via invite",
    }),
    kyteAccess: kyteAccessSchema,
    kyteGrants: z.array(kyteGrantSchema).optional(),
  })
  .superRefine((payload, ctx) => {
    if (payload.role === "ADMIN" && payload.kyteAccess !== "ALL") {
      ctx.addIssue({
        code: "custom",
        path: ["kyteAccess"],
        message: "ADMIN is org-wide only and requires kyteAccess = ALL",
      });
    }
    if (payload.kyteAccess === "SELECTED") {
      if (!payload.kyteGrants || payload.kyteGrants.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["kyteGrants"],
          message: "SELECTED access requires at least one kyte grant",
        });
      }
    } else if (payload.kyteGrants && payload.kyteGrants.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["kyteGrants"],
        message: "ALL access must not carry per-kyte grants",
      });
    }
  });

export type OrgInvitePayload = z.infer<typeof orgInvitePayloadSchema>;
