import type { Redis } from "ioredis";
import { moderationSweepProgressSchema } from "@kytelink/trpc";
import type { z } from "zod";

export type ModerationSweepProgress = z.infer<typeof moderationSweepProgressSchema>;

// Deliberately never expires: "when did we last sweep, and what did it find"
// is the answer the admin page shows between runs.
export const SWEEP_PROGRESS_KEY = "moderation:sweep:progress";

export async function readSweepProgress(redis: Redis): Promise<ModerationSweepProgress | null> {
  const raw = await redis.get(SWEEP_PROGRESS_KEY);
  if (!raw) return null;
  try {
    const parsed = moderationSweepProgressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writeSweepProgress(
  redis: Redis,
  progress: ModerationSweepProgress,
): Promise<void> {
  await redis.set(SWEEP_PROGRESS_KEY, JSON.stringify(progress));
}

// Holds the runId being cancelled plus who asked, so the run that observes the
// flag can stamp "Cancelled by …" without a second round-trip or a race with
// the mutation over the progress blob.
export const SWEEP_CANCEL_KEY = "moderation:sweep:cancel";

export interface SweepCancelRequest {
  runId: string;
  by: string;
}

export async function requestSweepCancel(
  redis: Redis,
  request: SweepCancelRequest,
): Promise<void> {
  // An hour outlives any sweep; a flag nobody consumed must not sit in Redis
  // forever waiting to be compared against a runId that will never exist.
  await redis.set(SWEEP_CANCEL_KEY, JSON.stringify(request), "EX", 3600);
}

/**
 * Consumes the cancel flag if and only if it names `runId`. A flag left behind
 * by an earlier run is reported as "not cancelled" and deliberately left in
 * place — deleting another run's request is not this run's call to make.
 */
export async function takeSweepCancel(
  redis: Redis,
  runId: string,
): Promise<SweepCancelRequest | null> {
  const raw = await redis.get(SWEEP_CANCEL_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const request = parsed as Partial<SweepCancelRequest>;
  if (typeof request.runId !== "string" || request.runId !== runId) return null;
  await redis.del(SWEEP_CANCEL_KEY);
  return { runId, by: typeof request.by === "string" ? request.by : "unknown" };
}

export async function clearSweepCancel(redis: Redis): Promise<void> {
  await redis.del(SWEEP_CANCEL_KEY);
}
