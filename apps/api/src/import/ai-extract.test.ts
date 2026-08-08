import { describe, expect, it } from "vitest";
import {
  aiExtractProposal,
  createImportChatClientFromEnv,
  type ImportChatClient,
} from "./ai-extract";
import { buildProposal } from "../routers/import";

function fakeClient(content: string): ImportChatClient {
  return {
    chat: {
      completions: {
        create: async () => ({ choices: [{ message: { content } }] }),
      },
    },
  } as unknown as ImportChatClient;
}

describe("aiExtractProposal (SH5a)", () => {
  it("validates and sanitizes the model output through the URL policy", async () => {
    const client = fakeClient(
      JSON.stringify({
        displayName: "Jane Maker",
        description: "Designer & builder",
        avatarUrl: "https://cdn.example.com/jane.png",
        links: [
          { title: "Portfolio", url: "example.com/jane" },
          { title: "Evil", url: "javascript:alert(1)" },
          { title: "Dupe", url: "https://example.com/jane" },
        ],
      }),
    );
    const proposal = await aiExtractProposal(client, "<html>...</html>", "https://foo.link");
    expect(proposal.displayName).toBe("Jane Maker");
    expect(proposal.avatarUrl).toBe("https://cdn.example.com/jane.png");
    expect(proposal.links).toHaveLength(1);
    expect(proposal.links[0]?.link).toBe("https://example.com/jane");
    expect(proposal.icons).toEqual([]);
  });

  it("throws when the model returns no content (router then falls back)", async () => {
    const client = fakeClient("");
    await expect(aiExtractProposal(client, "<html>", "https://foo.link")).rejects.toThrow();
  });
});

describe("createImportChatClientFromEnv (SH5a capability gate)", () => {
  it("is null unless the OpenAI moderation capability is configured", () => {
    expect(createImportChatClientFromEnv({})).toBeNull();
    expect(createImportChatClientFromEnv({ MODERATION_PROVIDER: "none", OPENAI_API_KEY: "x" })).toBeNull();
    expect(createImportChatClientFromEnv({ MODERATION_PROVIDER: "openai" })).toBeNull();
    expect(
      createImportChatClientFromEnv({ MODERATION_PROVIDER: "openai", OPENAI_API_KEY: "sk-test" }),
    ).not.toBeNull();
  });
});

describe("buildProposal platform routing (SH5a)", () => {
  const linktreeHtml =
    '<html><head><meta property="og:title" content="Creator" />' +
    '<meta property="og:description" content="my bio" /></head>' +
    '<body><a href="https://shop.example.com">Shop</a></body></html>';

  it("uses the deterministic parser for known platforms", async () => {
    const proposal = await buildProposal("https://linktr.ee/creator", true, linktreeHtml);
    expect(proposal.displayName).toBe("Creator");
    expect(proposal.links.some((l) => l.link.startsWith("https://shop.example.com"))).toBe(true);
  });

  it("falls back to the deterministic parser for a generic URL when AI is off", async () => {
    const html =
      '<html><head><meta property="og:title" content="Generic Person" /></head>' +
      '<body><a href="https://one.example.com">One</a></body></html>';
    const proposal = await buildProposal("https://some-site.example/u", false, html);
    expect(proposal.displayName).toBe("Generic Person");
  });

  it("stays deterministic for a generic URL when the AI capability lacks a client", async () => {
    // aiEnabled=true but no OPENAI env in the test process -> no client -> deterministic.
    const html = '<html><body><a href="https://two.example.com">Two</a></body></html>';
    const proposal = await buildProposal("https://some-site.example/u", true, html);
    expect(proposal.links.some((l) => l.link.startsWith("https://two.example.com"))).toBe(true);
  });
});
