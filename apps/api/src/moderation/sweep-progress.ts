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
