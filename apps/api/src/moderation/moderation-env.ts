import OpenAI from "openai";
import { createNoneProvider } from "./provider-none";
import { createOpenAiProvider } from "./provider-openai";
import type { ModerationProvider } from "./types";

const DEFAULT_MODERATION_MODEL = "gpt-5-mini";
/**
 * Brand-authenticity calls decide whether a real company is on the page, and
 * getting that wrong is the expensive direction, so they run on the full model.
 */
const DEFAULT_ESCALATION_MODEL = "gpt-5";

const DEFAULT_SWEEP_CONCURRENCY = 16;
const DEFAULT_SCAN_CONCURRENCY = 8;
// A typo like `MODERATION_SWEEP_CONCURRENCY=1600` would open 1600 sockets to
// the provider and earn a rate-limit ban, so the knob is clamped, not trusted.
const MAX_CONCURRENCY = 64;

function readConcurrency(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, MAX_CONCURRENCY);
}

/** How many kytes the admin "re-review every kyte" sweep reviews at once. */
export function getSweepConcurrency(env: NodeJS.ProcessEnv = process.env): number {
  return readConcurrency(env.MODERATION_SWEEP_CONCURRENCY, DEFAULT_SWEEP_CONCURRENCY);
}

/** How many publish-time scans run at once. */
export function getScanConcurrency(env: NodeJS.ProcessEnv = process.env): number {
  return readConcurrency(env.MODERATION_SCAN_CONCURRENCY, DEFAULT_SCAN_CONCURRENCY);
}

const DEFAULT_SUSPEND_MIN_CONFIDENCE = 0.8;

/**
 * How sure the AI has to be before its SUSPEND is applied; anything under it is
 * recorded with its signals and approved. Deterministic hits do not pass through
 * this gate. MODERATION_SUSPEND_MIN_CONFIDENCE raises or lowers the bar.
 */
export function getSuspendMinConfidence(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.MODERATION_SUSPEND_MIN_CONFIDENCE;
  if (raw === undefined || raw.trim() === "") return DEFAULT_SUSPEND_MIN_CONFIDENCE;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return DEFAULT_SUSPEND_MIN_CONFIDENCE;
  return parsed;
}

export function createProviderFromEnv(env: NodeJS.ProcessEnv = process.env): ModerationProvider {
  if (env.MODERATION_PROVIDER !== "openai" || !env.OPENAI_API_KEY) {
    return createNoneProvider();
  }
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
  });
  return createOpenAiProvider({
    client,
    model: env.MODERATION_MODEL ?? DEFAULT_MODERATION_MODEL,
    escalationModel: env.MODERATION_ESCALATION_MODEL ?? DEFAULT_ESCALATION_MODEL,
  });
}
