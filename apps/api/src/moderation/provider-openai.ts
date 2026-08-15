import type OpenAI from "openai";
import {
  MODERATION_JSON_SCHEMA,
  MODERATION_SYSTEM_PROMPT,
  buildModerationUserContent,
  openAiVerdictSchema,
} from "./prompt";
import type {
  ModerationKyteSnapshot,
  ModerationProvider,
  ModerationReviewContext,
  ProviderReviewOutcome,
} from "./types";

export type OpenAiChatClient = Pick<OpenAI, "chat">;

export interface OpenAiProviderOptions {
  client: OpenAiChatClient;
  model: string;
  /** Stronger model for brand-authenticity calls and borderline suspends. */
  escalationModel?: string;
  maxAttempts?: number;
  retryDelayMs?: number;
}

const DEFAULT_MIN_SUSPEND_CONFIDENCE = 0.8;

export class OpenAiModerationFailure extends Error {
  constructor(public readonly sourceError: unknown) {
    super("openai moderation provider failed after retries");
  }
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toOutcome(
  parsed: ReturnType<typeof openAiVerdictSchema.parse>,
  model: string,
  escalation: string | undefined,
): ProviderReviewOutcome {
  return {
    verdict: parsed.verdict,
    categories: parsed.categories,
    confidence: parsed.confidence,
    reason: parsed.reason,
    signals: {
      sus_link: parsed.signals.sus_link.map((url) => ({ url, pattern: "ai_flagged" })),
      sus_redirect: parsed.signals.sus_redirect
        ? { url: "", pattern: "ai_flagged_redirect" }
        : undefined,
      nsfw_image: parsed.signals.nsfw_image ? { reason: parsed.reason } : undefined,
      nsfw_text: parsed.signals.nsfw_text ? { reason: parsed.reason } : undefined,
    },
    model,
    escalation,
  };
}

async function callOnce(
  client: OpenAiChatClient,
  model: string,
  snapshot: ModerationKyteSnapshot,
  context: ModerationReviewContext,
  escalation: string | undefined,
): Promise<ProviderReviewOutcome> {
  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: "system", content: MODERATION_SYSTEM_PROMPT },
      { role: "user", content: buildModerationUserContent(snapshot, context) },
    ],
    response_format: { type: "json_schema", json_schema: MODERATION_JSON_SCHEMA },
  };

  const completion = await client.chat.completions.create(params);
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("openai moderation call returned no content");
  }
  const parsed = openAiVerdictSchema.parse(JSON.parse(content) as unknown);
  return toOutcome(parsed, model, escalation);
}

/** A flagged page is decided by the stronger model from the start. */
function escalationReasonFor(context: ModerationReviewContext): string | undefined {
  const hit = context.deterministicHits?.[0];
  if (hit) return `deterministic:${hit.rule}`;
  if (context.brandClaim) return "brand_claim";
  const advisory = context.advisory ?? [];
  return advisory.some(
    (signal) =>
      signal.key === "brand_mention" ||
      signal.key === "punycode_host" ||
      signal.key === "brand_claim",
  )
    ? "brand_signal"
    : undefined;
}

export function createOpenAiProvider(options: OpenAiProviderOptions): ModerationProvider {
  const maxAttempts = options.maxAttempts ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 200;
  const escalationModel = options.escalationModel ?? options.model;

  return {
    name: "openai",
    async review(
      snapshot: ModerationKyteSnapshot,
      context: ModerationReviewContext = {},
    ): Promise<ProviderReviewOutcome> {
      const upfront = escalationReasonFor(context);
      const minConfidence = context.minSuspendConfidence ?? DEFAULT_MIN_SUSPEND_CONFIDENCE;

      const attempt = async (model: string, escalation: string | undefined) => {
        let lastError: unknown;
        for (let tries = 1; tries <= maxAttempts; tries += 1) {
          try {
            return await callOnce(options.client, model, snapshot, context, escalation);
          } catch (error) {
            lastError = error;
            if (tries < maxAttempts) await delay(retryDelayMs * tries);
          }
        }
        throw new OpenAiModerationFailure(lastError);
      };

      if (upfront) {
        return attempt(escalationModel, upfront);
      }

      const first = await attempt(options.model, undefined);
      // A suspend the standard model is not sure about is exactly the case
      // worth spending the better model on, and its verdict then governs.
      if (first.verdict === "SUSPEND" && first.confidence < minConfidence) {
        return attempt(escalationModel, "low_confidence_suspend");
      }
      return first;
    },
  };
}
