import type OpenAI from "openai";
import {
  MODERATION_JSON_SCHEMA,
  MODERATION_SYSTEM_PROMPT,
  buildModerationUserContent,
  openAiVerdictSchema,
} from "./prompt";
import type { ModerationKyteSnapshot, ModerationProvider, ProviderReviewOutcome } from "./types";

export type OpenAiChatClient = Pick<OpenAI, "chat">;

export interface OpenAiProviderOptions {
  client: OpenAiChatClient;
  model: string;
  maxAttempts?: number;
  retryDelayMs?: number;
}

export class OpenAiModerationFailure extends Error {
  constructor(public readonly sourceError: unknown) {
    super("openai moderation provider failed after retries");
  }
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toOutcome(parsed: ReturnType<typeof openAiVerdictSchema.parse>): ProviderReviewOutcome {
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
  };
}

async function callOnce(
  client: OpenAiChatClient,
  model: string,
  snapshot: ModerationKyteSnapshot,
): Promise<ProviderReviewOutcome> {
  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: "system", content: MODERATION_SYSTEM_PROMPT },
      { role: "user", content: buildModerationUserContent(snapshot) },
    ],
    response_format: { type: "json_schema", json_schema: MODERATION_JSON_SCHEMA },
  };

  const completion = await client.chat.completions.create(params);
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("openai moderation call returned no content");
  }
  const parsed = openAiVerdictSchema.parse(JSON.parse(content) as unknown);
  return toOutcome(parsed);
}

export function createOpenAiProvider(options: OpenAiProviderOptions): ModerationProvider {
  const maxAttempts = options.maxAttempts ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 200;

  return {
    name: "openai",
    async review(snapshot: ModerationKyteSnapshot): Promise<ProviderReviewOutcome> {
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          return await callOnce(options.client, options.model, snapshot);
        } catch (error) {
          lastError = error;
          if (attempt < maxAttempts) {
            await delay(retryDelayMs * attempt);
          }
        }
      }
      throw new OpenAiModerationFailure(lastError);
    },
  };
}
