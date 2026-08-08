import type OpenAI from "openai";
import { z } from "zod";
import type { ModerationKyteSnapshot } from "./types";

interface ModerationJsonSchema {
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
}

export const openAiVerdictSchema = z.object({
  verdict: z.enum(["APPROVE", "SUSPEND"]),
  categories: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  signals: z.object({
    nsfw_image: z.boolean(),
    nsfw_text: z.boolean(),
    sus_link: z.array(z.string()),
    sus_redirect: z.boolean(),
  }),
});

export const MODERATION_JSON_SCHEMA: ModerationJsonSchema = {
  name: "kytelink_moderation_verdict",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      verdict: { type: "string", enum: ["APPROVE", "SUSPEND"] },
      categories: { type: "array", items: { type: "string" } },
      confidence: { type: "number" },
      reason: { type: "string" },
      signals: {
        type: "object",
        additionalProperties: false,
        properties: {
          nsfw_image: { type: "boolean" },
          nsfw_text: { type: "boolean" },
          sus_link: { type: "array", items: { type: "string" } },
          sus_redirect: { type: "boolean" },
        },
        required: ["nsfw_image", "nsfw_text", "sus_link", "sus_redirect"],
      },
    },
    required: ["verdict", "categories", "confidence", "reason", "signals"],
  },
};

export const MODERATION_SYSTEM_PROMPT = `You are the content moderation reviewer for Kytelink, a link-in-bio platform. Review the given public profile content and return a strict JSON verdict.

Policy:
1. Phishing/impersonation — the profile poses as a real company or its support/login/verification/account-recovery flow (telcos, ISPs, banks, delivery companies, crypto exchanges are frequent targets) -> SUSPEND.
2. NSFW — an 18+/pornographic avatar, profile text, or link destinations that are obviously adult-targeted -> SUSPEND.
3. Malicious links — known-bad patterns or lookalike domains in any link or the redirect target -> SUSPEND.
4. Ambiguity rule — ordinary profiles, adult-adjacent-but-legal content (e.g. lingerie brand marketing), and low-confidence cases -> APPROVE and log. Prefer false negatives with fast admin recourse over wrongful takedowns. Do not be trigger-happy.

Respond only with the JSON object described by the schema. sus_link must list any offending URLs verbatim from the input.`;

export function buildModerationUserContent(
  snapshot: ModerationKyteSnapshot,
): Array<OpenAI.Chat.Completions.ChatCompletionContentPart> {
  const linksText = snapshot.links.length
    ? snapshot.links.map((link) => `- "${link.title}" -> ${link.url}`).join("\n")
    : "(no links)";
  const iconUrls = snapshot.icons.map((icon) => icon.url).filter((url): url is string => Boolean(url));
  const iconsText = iconUrls.length ? iconUrls.join(", ") : "(no icons)";

  const text = [
    `username: ${snapshot.username ?? "(none)"}`,
    `displayName: ${snapshot.displayName ?? "(none)"}`,
    `description: ${snapshot.description ?? "(none)"}`,
    `links:\n${linksText}`,
    `icon urls: ${iconsText}`,
    `redirectUrl: ${snapshot.redirectUrl ?? "(none)"}`,
  ].join("\n\n");

  const parts: Array<OpenAI.Chat.Completions.ChatCompletionContentPart> = [{ type: "text", text }];
  if (snapshot.avatarUrl) {
    parts.push({ type: "image_url", image_url: { url: snapshot.avatarUrl } });
  }
  return parts;
}
