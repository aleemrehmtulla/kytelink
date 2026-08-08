import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  createdAt: z.date(),
  image: z.string().nullable().optional(),
});

export type User = z.infer<typeof userSchema>;

/**
 * Platform-level account standing, distinct from a kyte's ModerationStatus.
 * SUSPENDED never blocks sign-in: the account stays reachable and read-only, so
 * the person can read their own data, see the recorded reason, and appeal.
 * Suspending a user also suspends every organization they belong to (cause
 * `user_<id>`), which is what takes their pages offline. Always carries a reason
 * and is admin-reversible.
 */
export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export const userStatusSchema = z.enum(USER_STATUSES);
export type UserStatus = (typeof USER_STATUSES)[number];

export const PLATFORM_ROLES = ["USER", "ADMIN"] as const;
export const platformRoleSchema = z.enum(PLATFORM_ROLES);
