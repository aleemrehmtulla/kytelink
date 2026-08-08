import { z } from "zod";
import { type ImportProposal, importProposalSchema, safeWebUrlSchema } from "@kytelink/schemas";
import { router } from "@kytelink/trpc";
import { kyte } from "../trpc/procedures";
import { assertCan } from "../trpc/permissions";
import { aiExtractProposal, createImportChatClientFromEnv } from "../import/ai-extract";
import {
  detectPlatform,
  emptyProposal,
  parseHtmlToProposal,
  parseLinktreeToProposal,
} from "../import/parsers";
import { ssrfSafeFetchText } from "../import/ssrf-fetch";

export async function buildProposal(
  url: string,
  aiEnabled: boolean,
  html: string,
): Promise<ImportProposal> {
  // Known platforms use the deterministic parser. Anything else goes to the AI
  // extractor when the moderation/OpenAI capability is on (doc-06); a broken
  // deterministic parse also falls back to AI when available. Without the key we
  // keep the deterministic-only path (graceful capability-off fallback).
  const platform = detectPlatform(url);
  if (platform === "linktree") {
    const parsed = parseLinktreeToProposal(html);
    if (parsed) return parsed;
  }
  if (platform !== "generic") {
    const parsed = parseHtmlToProposal(html);
    if (parsed.links.length > 0 || parsed.displayName || parsed.description) return parsed;
  }
  if (aiEnabled) {
    const client = createImportChatClientFromEnv();
    if (client) return aiExtractProposal(client, html, url);
  }
  return parseHtmlToProposal(html);
}

export const importRouter = router({
  fromUrl: kyte
    .input(z.object({ kyteId: z.string().min(1), url: safeWebUrlSchema }))
    .output(importProposalSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.access.effectiveRole, "edit_draft");
      let proposal: ImportProposal;
      try {
        const html = await ssrfSafeFetchText(input.url);
        proposal = await buildProposal(input.url, ctx.config.capabilities.moderation, html);
      } catch {
        proposal = emptyProposal();
      }
      return proposal;
    }),
});
