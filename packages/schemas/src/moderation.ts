import { z } from "zod";

export const MODERATION_STATUSES = ["APPROVED", "SUSPENDED"] as const;
export const moderationStatusSchema = z.enum(MODERATION_STATUSES);
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const MODERATION_VERDICTS = ["APPROVE", "SUSPEND"] as const;
export type ModerationVerdict = (typeof MODERATION_VERDICTS)[number];

export const REPORT_STATUSES = ["OPEN", "ACTIONED", "DISMISSED"] as const;
export const reportStatusSchema = z.enum(REPORT_STATUSES);
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const ABUSE_REPORT_REASONS = ["impersonation", "nsfw", "other"] as const;
export const abuseReportReasonSchema = z.enum(ABUSE_REPORT_REASONS);
export type AbuseReportReason = (typeof ABUSE_REPORT_REASONS)[number];
