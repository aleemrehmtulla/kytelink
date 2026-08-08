import { z } from "zod";

export const APPEAL_KINDS = ["kyte", "org", "user"] as const;
export const appealKindSchema = z.enum(APPEAL_KINDS);
export type AppealKind = (typeof APPEAL_KINDS)[number];

export const APPEAL_STATUSES = ["OPEN", "RESOLVED", "DISMISSED"] as const;
export const appealStatusSchema = z.enum(APPEAL_STATUSES);
export type AppealStatus = (typeof APPEAL_STATUSES)[number];

export const APPEAL_PATH = "/appeal";

/**
 * Public intake body for `POST /appeal`. Unauthenticated by design — a suspended
 * account can still sign in, but so can someone locked out of their email, and
 * an appeal must never depend on the thing being appealed.
 */
export const appealSubmissionSchema = z.object({
  kind: appealKindSchema,
  handle: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  message: z.string().trim().min(10).max(2000),
});

export type AppealSubmission = z.infer<typeof appealSubmissionSchema>;
