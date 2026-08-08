import OpenAI from "openai";
import { createNoneProvider } from "./provider-none";
import { createOpenAiProvider } from "./provider-openai";
import type { ModerationProvider } from "./types";

const DEFAULT_MODERATION_MODEL = "gpt-5-mini";

export function createProviderFromEnv(env: NodeJS.ProcessEnv = process.env): ModerationProvider {
  if (env.MODERATION_PROVIDER !== "openai" || !env.OPENAI_API_KEY) {
    return createNoneProvider();
  }
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
  });
  return createOpenAiProvider({ client, model: env.MODERATION_MODEL ?? DEFAULT_MODERATION_MODEL });
}
