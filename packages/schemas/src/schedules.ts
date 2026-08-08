import { z } from "zod";
import { profileContentSchema } from "./profile-content";

export const SCHEDULE_STATUSES = ["PENDING", "PUBLISHED", "CANCELED", "FAILED"] as const;

export const scheduleStatusSchema = z.enum(SCHEDULE_STATUSES);
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const SCHEDULE_MIN_LEAD_MS = 5 * 60 * 1000;
export const SCHEDULE_MAX_HORIZON_MS = 365 * 24 * 60 * 60 * 1000;

export const scheduleSnapshotSchema = profileContentSchema;

export const schedulePublishInputSchema = z.object({
  scheduledFor: z.coerce.date(),
  timezone: z.string().min(1),
});

export const SCHEDULE_LEADS = ["ok", "past", "too-soon", "too-far"] as const;
export type ScheduleLead = (typeof SCHEDULE_LEADS)[number];

/**
 * "past" and "too-soon" are separated from "too-far" because they are not the
 * same kind of mistake: a time that has already gone by (or is inside the
 * minimum lead) is a request to publish now, which the editor offers to do.
 * Only "too-far" is a value the user has to change.
 */
export function classifyScheduleLead(scheduledFor: Date, now: Date = new Date()): ScheduleLead {
  const delta = scheduledFor.getTime() - now.getTime();
  if (delta <= 0) return "past";
  if (delta < SCHEDULE_MIN_LEAD_MS) return "too-soon";
  if (delta > SCHEDULE_MAX_HORIZON_MS) return "too-far";
  return "ok";
}

export function isScheduleLeadValid(scheduledFor: Date, now: Date = new Date()): boolean {
  return classifyScheduleLead(scheduledFor, now) === "ok";
}
