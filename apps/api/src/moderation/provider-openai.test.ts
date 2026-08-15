import { describe, expect, it, vi } from "vitest";
import { buildSnapshot } from "./fixtures";
import { createOpenAiProvider, type OpenAiChatClient } from "./provider-openai";
import type { BrandClaim, ModerationReviewContext } from "./types";

interface Verdict {
  verdict: "APPROVE" | "SUSPEND";
  confidence: number;
  reason?: string;
}

function clientReturning(...verdicts: Verdict[]): OpenAiChatClient {
  const create = vi.fn();
  for (const verdict of verdicts) {
    create.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              verdict: verdict.verdict,
              categories: verdict.verdict === "SUSPEND" ? ["brand_impersonation"] : [],
              confidence: verdict.confidence,
              reason: verdict.reason ?? "because",
              signals: { nsfw_image: false, nsfw_text: false, sus_link: [], sus_redirect: false },
            }),
          },
        },
      ],
    });
  }
  return { chat: { completions: { create } } } as unknown as OpenAiChatClient;
}

function modelsUsed(client: OpenAiChatClient): string[] {
  const create = client.chat.completions.create as unknown as ReturnType<typeof vi.fn>;
  return create.mock.calls.map((call) => (call[0] as { model: string }).model);
}

const brandClaim: BrandClaim = {
  brand: "Rogers",
  sector: "telecom",
  claim: "rogers support",
  field: "displayName",
  value: "Rogers Support",
  officialDomains: ["rogers.com"],
  offBrandDestinations: [{ url: "https://example.com", pattern: "off_brand_destination" }],
};

function provider(client: OpenAiChatClient) {
  return createOpenAiProvider({
    client,
    model: "gpt-5-mini",
    escalationModel: "gpt-5",
    retryDelayMs: 0,
  });
}

describe("createOpenAiProvider — model escalation", () => {
  it("sends a routine review to the standard model only", async () => {
    const client = clientReturning({ verdict: "APPROVE", confidence: 0.99 });

    const outcome = await provider(client).review(buildSnapshot(), { advisory: [] });

    expect(modelsUsed(client)).toEqual(["gpt-5-mini"]);
    expect(outcome.model).toBe("gpt-5-mini");
    expect(outcome.escalation).toBeUndefined();
  });

  it("decides a brand claim on the stronger model from the start", async () => {
    const client = clientReturning({ verdict: "SUSPEND", confidence: 0.91 });
    const context: ModerationReviewContext = { brandClaim, advisory: [] };

    const outcome = await provider(client).review(buildSnapshot(), context);

    expect(modelsUsed(client)).toEqual(["gpt-5"]);
    expect(outcome.escalation).toBe("brand_claim");
  });

  it("decides a deterministic hit on the stronger model, and can still approve it", async () => {
    const client = clientReturning({
      verdict: "APPROVE",
      confidence: 0.9,
      reason: "the page quotes the link as an example of a scam",
    });

    const outcome = await provider(client).review(buildSnapshot(), {
      deterministicHits: [
        {
          rule: "ip_logger",
          pattern: "blocklist:grabify.link",
          url: "https://grabify.link/x",
          kind: "link",
        },
      ],
    });

    expect(modelsUsed(client)).toEqual(["gpt-5"]);
    expect(outcome.escalation).toBe("deterministic:ip_logger");
    expect(outcome.verdict).toBe("APPROVE");
  });

  it("escalates on a brand mention even without a full claim", async () => {
    const client = clientReturning({ verdict: "APPROVE", confidence: 0.9 });

    const outcome = await provider(client).review(buildSnapshot(), {
      advisory: [{ key: "brand_mention", detail: "Bell named in profile text" }],
    });

    expect(modelsUsed(client)).toEqual(["gpt-5"]);
    expect(outcome.escalation).toBe("brand_signal");
  });

  it("re-runs an under-confident suspend on the stronger model and takes its verdict", async () => {
    const client = clientReturning(
      { verdict: "SUSPEND", confidence: 0.55, reason: "not sure" },
      { verdict: "APPROVE", confidence: 0.97, reason: "ordinary business" },
    );

    const outcome = await provider(client).review(buildSnapshot(), {
      advisory: [],
      minSuspendConfidence: 0.8,
    });

    expect(modelsUsed(client)).toEqual(["gpt-5-mini", "gpt-5"]);
    expect(outcome.verdict).toBe("APPROVE");
    expect(outcome.confidence).toBe(0.97);
    expect(outcome.model).toBe("gpt-5");
    expect(outcome.escalation).toBe("low_confidence_suspend");
  });

  it("leaves a confident suspend on the standard model", async () => {
    const client = clientReturning({ verdict: "SUSPEND", confidence: 0.95 });

    const outcome = await provider(client).review(buildSnapshot(), {
      advisory: [],
      minSuspendConfidence: 0.8,
    });

    expect(modelsUsed(client)).toEqual(["gpt-5-mini"]);
    expect(outcome.verdict).toBe("SUSPEND");
  });

  it("puts the brand's official domains in front of the model", async () => {
    const client = clientReturning({ verdict: "APPROVE", confidence: 0.9 });

    await provider(client).review(buildSnapshot(), { brandClaim, advisory: [] });

    const create = client.chat.completions.create as unknown as ReturnType<typeof vi.fn>;
    const params = create.mock.calls[0]?.[0] as {
      messages: Array<{ content: Array<{ type: string; text?: string }> | string }>;
    };
    const userContent = params.messages[1]?.content;
    const text = Array.isArray(userContent) ? (userContent[0]?.text ?? "") : "";
    expect(text).toContain("brand claim flagged: Rogers (telecom)");
    expect(text).toContain("Rogers's official domains: rogers.com");
    expect(text).toContain("https://example.com (off_brand_destination)");
  });
});
