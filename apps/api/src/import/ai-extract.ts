import OpenAI from "openai";
import {
  IMPORT_MAX_LINKS,
  type ImportProposal,
  importProposalSchema,
  type Link,
  prefixHttps,
  safeWebUrlSchema,
} from "@kytelink/schemas";

export type ImportChatClient = Pick<OpenAI, "chat">;

const DEFAULT_MODEL = "gpt-5-mini";
const MAX_HTML_CHARS = 60_000;

const SYSTEM_PROMPT =
  "You extract a link-in-bio profile from a web page's HTML. Return the person's " +
  "display name, a short bio/description, their avatar image URL, and the list of " +
  "outbound links (each with a human label and an absolute http(s) URL). Only include " +
  "links that appear to be the profile's own outbound links, not navigation/legal/ads. " +
  "Never invent URLs. If a field is unknown, omit it.";

const RESPONSE_SCHEMA = {
  name: "import_proposal",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      displayName: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      avatarUrl: { type: ["string", "null"] },
      links: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            url: { type: "string" },
          },
          required: ["title", "url"],
        },
      },
    },
    required: ["displayName", "description", "avatarUrl", "links"],
  },
} as const;

interface RawExtraction {
  displayName?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  links?: { title?: string | null; url?: string | null }[];
}

export function createImportChatClientFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ImportChatClient | null {
  if (env.MODERATION_PROVIDER !== "openai" || !env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
}

// Sanitises the raw LLM output through the same URL/link policy the deterministic
// parser uses, so a single hallucinated URL can't reject the whole proposal.
function toProposal(raw: RawExtraction): ImportProposal {
  const seen = new Set<string>();
  const links: Link[] = [];
  for (const entry of raw.links ?? []) {
    if (links.length >= IMPORT_MAX_LINKS) break;
    const href = (entry?.url ?? "").trim();
    if (!href) continue;
    const normalized = safeWebUrlSchema.safeParse(prefixHttps(href));
    if (!normalized.success || seen.has(normalized.data)) continue;
    seen.add(normalized.data);
    const title = (entry?.title ?? "").trim().slice(0, 80);
    links.push({ title: title.length > 0 ? title : normalized.data, link: normalized.data });
  }
  const avatar = raw.avatarUrl ? safeWebUrlSchema.safeParse(raw.avatarUrl) : undefined;

  return importProposalSchema.parse({
    displayName: raw.displayName ? raw.displayName.trim() || undefined : undefined,
    description: raw.description ? raw.description.trim() || undefined : undefined,
    avatarUrl: avatar && avatar.success ? avatar.data : undefined,
    links,
    icons: [],
  });
}

export async function aiExtractProposal(
  client: ImportChatClient,
  html: string,
  sourceUrl: string,
  model: string = DEFAULT_MODEL,
): Promise<ImportProposal> {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Source URL: ${sourceUrl}\n\nHTML:\n${html.slice(0, MAX_HTML_CHARS)}`,
      },
    ],
    response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI import returned no content.");
  return toProposal(JSON.parse(content) as RawExtraction);
}
