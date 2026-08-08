import type { ModerationStatus } from "./moderation";
import type { UserStatus } from "./user";

/**
 * THE effective-suspension rule. Serving, the editor, and every mutation guard
 * ask this one function so a kyte can never be readable-but-editable (or the
 * reverse) depending on which layer looked.
 */
export function isKyteEffectivelySuspended(input: {
  moderationStatus: ModerationStatus;
  orgSuspendedAt: Date | string | null;
}): boolean {
  return input.moderationStatus === "SUSPENDED" || input.orgSuspendedAt !== null;
}

export function isUserSuspended(status: UserStatus): boolean {
  return status === "SUSPENDED";
}

/**
 * `Organization.suspensionCause`: null means an admin suspended the org
 * directly, and a restore of the user below must leave it alone.
 */
export function userSuspensionCause(userId: string): string {
  return `user_${userId}`;
}

export function isUserSuspensionCause(cause: string | null, userId: string): boolean {
  return cause === userSuspensionCause(userId);
}
