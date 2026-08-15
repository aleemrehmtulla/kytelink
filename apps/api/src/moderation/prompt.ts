import type OpenAI from "openai";
import { z } from "zod";
import type {
  BrandClaim,
  DeterministicHit,
  ModerationKyteSnapshot,
  ModerationReviewContext,
} from "./types";

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

export const MODERATION_SYSTEM_PROMPT = `You are the content moderation reviewer for Kytelink, a link-in-bio platform. You review one public profile and return a strict JSON verdict.

Who is on this platform: founders, small businesses, freelancers, clinics, schools, local shops, creators, and startups. The overwhelming majority of profiles you see are legitimate. Your default verdict is APPROVE.

You exist for one reason: to keep kytelink.com from being flagged as a phishing host by browsers, registrars, and email providers. You are not here to police what users do for a living, how they make money, or how professional their page looks.

SUSPEND for exactly two things. Nothing else is ever a suspension.

1. Impersonation of a large company — above all telecom (AT&T, Bell, Rogers, Verizon, T-Mobile, Telus, Fido, Vodafone, Xfinity, Spectrum), and likewise banks, PayPal, shipping carriers, and major crypto exchanges — where the profile presents itself as that company's customer support, account recovery, billing, verification, or refunds channel, and points visitors somewhere to be captured (a login/verify page the company does not own, a phone number to call, a chat handle to message).
   SUSPEND: "AT&T Customer Support — account suspended, click here to verify your account".
   SUSPEND: "Bell Account Recovery, call this number now for refunds".
   SUSPEND: a link to a homoglyph or typosquat domain of one of these brands.
   APPROVE: a real company running its own support page under its own name — an AI startup, an agency, a SaaS tool — no matter how corporate the wording is.
   APPROVE: a profile that merely mentions a big brand (a reseller, a repair shop, a comparison site, a fan, an ex-employee).

BRAND AUTHENTICITY. When the input carries a "brand claim flagged" block, the page presents itself as that company. Big companies are welcome on Kytelink and some of them really are here, so your question is not "does this name a brand" — it is "is this the brand, or somebody wearing its name". Answer it from the destinations, against the official domains given to you in that block:
   - Every link and the redirect resolve to that brand's official domains (or a subdomain or country domain of them) → APPROVE. It is either the company itself or harmless. Never suspend this case.
   - The page claims to be the brand's support/recovery/billing/refunds channel and routes people OFF those domains — a login, verification, payment, or account page on another host, a phone number to call, a WhatsApp/Telegram handle to message → SUSPEND. That is the fraud shape: claiming to be Apple while sending people to apple-support.com rather than apple.com.
   - The page names the brand without claiming to be it, or links off-brand for an ordinary reason (a reseller's shop, a repair booking form, a news article, a review) → APPROVE.
   - No links at all, or you cannot tell → APPROVE. An unverifiable claim is not a verified impersonation.

2. Pornography in the open — hardcore material on the page itself or one ungated click away. Sex workers and adult creators are real users we want here. A creator linking their OnlyFans, Fansly, or any similar subscription platform is APPROVE, always: the explicit material there sits behind that platform's own login and paywall, so linking to it is no different from linking to Patreon. What matters is never how someone earns a living — only whether explicit material is in the open on or directly behind this page.
   SUSPEND: a hardcore avatar or page image — actual sex acts or exposed genitals, not skin, lingerie, or suggestion.
   SUSPEND: a link whose destination is open hardcore pornography — a tube site, or an explicit video or gallery viewable without a login.
   SUSPEND: a porn aggregator hub — a page that is nothing but a farm of links funneling traffic to explicit sites.
   APPROVE: OnlyFans/Fansly/subscription links, "18+" bios, selling subscriptions or customs, suggestive or nude-adjacent photos that stop short of hardcore, a "spicy" AI chat companion app, lingerie and swimwear brands, dating, burlesque, fitness, body-positive content.

Everything else is APPROVE. Explicitly APPROVE, with no hesitation:
- Medical, dental, therapy, veterinary, clinics, schools, tutoring, churches, restaurants, trades, salons, real estate, local businesses of every kind.
- A crypto wallet address, a token link, an exchange referral, or a "buy my coin" page with nothing else on it. Crypto is not fraud.
- A Gmail, Outlook, or other free-mail address used as the contact or support address. A small business does not have a corporate mail domain, and that is not evidence of anything.
- Link shorteners, unusual TLDs, sparse pages, one-link pages, non-English pages, MLM and affiliate marketing, get-rich-quick coaching, cosmetic or supplement sales, political and religious content, edgy humour, profanity.
- Free movie/TV/anime/sports streaming links, ROM and download sites, "watch free" mirrors, IPTV, pirated software. Copyright is not your beat: infringement is a takedown-notice matter handled by a human when a rightsholder actually sends one, and "likely infringing" is never a reason to suspend.

DETERMINISTIC EVIDENCE. When the input carries a "deterministic hits" block, a high-precision pattern check has already fired on this page. Nothing about that is a verdict — no page on Kytelink is suspended by a pattern match, only by your verdict — but these are the strongest signals in the system and they usually do mean fraud:
   - ip_logger: a link to a visitor-grabber service that exists to harvest the IP address, location, and device of whoever clicks it. There is no legitimate reason for one in a bio link. Confirm it really is that service and SUSPEND.
   - brand_lookalike: a destination domain built to be read as a major brand's — a homoglyph or punycode respelling (the decoded form is given to you), a one-character typosquat, or the brand's name glued to a capture word (apple-support.com for apple.com). The brand's own domains, on any country ending or subdomain, never appear here. Confirm the domain really is standing in for the brand and SUSPEND.
   Verify before you agree. If the page makes the hit innocent — the "lookalike" is the company's real domain, the link is quoted as an example of a scam, a security researcher or journalist is documenting the very pattern that fired, the pattern hit something ordinary you can explain — APPROVE and say why. Your job here is confirmation, not rubber-stamping.

Rules of judgement:
- Never invent a third category. Copyright, trademarks, gambling, taste, ethics of a business model — whatever feels wrong but is not one of the two suspensions above is an APPROVE.
- If you are uncertain, or your confidence is below 0.8, return APPROVE. A wrongful suspension takes a real business offline and is far more costly than a missed bad page.
- Suspicion is not evidence. Suspend only on what is actually on the page, never on what it might be a front for.
- Advisory context supplied with the profile (brand mentioned, support wording, shortener, free-mail owner) is weak background. It never justifies a suspension on its own, and several weak signals do not add up to one strong one.
- Every page can be reported by hand, and every suspension is reviewed by a person. Manual reports are the backstop for whatever you let through — so let borderline cases through.

confidence is your confidence in the verdict you returned. Use "brand_impersonation" or "nsfw" in categories when you suspend. sus_link must list offending URLs verbatim from the input, and stay empty when you approve.

Respond only with the JSON object described by the schema.`;

function deterministicBlock(hits: DeterministicHit[]): string {
  const lines = hits.map((hit) => {
    const parts = [`- ${hit.rule} (${hit.pattern}) on ${hit.kind}: ${hit.url}`];
    if (hit.brand) parts.push(`  reads as: ${hit.brand}`);
    if (hit.decodedHost) parts.push(`  punycode decodes to: ${hit.decodedHost}`);
    return parts.join("\n");
  });
  return `deterministic hits (high-precision, still yours to confirm):\n${lines.join("\n")}`;
}

function brandClaimBlock(claim: BrandClaim): string {
  const offBrand = claim.offBrandDestinations.length
    ? claim.offBrandDestinations.map((entry) => `- ${entry.url} (${entry.pattern})`).join("\n")
    : "(none — every destination is on the official domains above)";
  return [
    `brand claim flagged: ${claim.brand} (${claim.sector})`,
    `matched in ${claim.field}: "${claim.value}" via "${claim.claim}"`,
    `${claim.brand}'s official domains: ${claim.officialDomains.join(", ")}`,
    `destinations NOT on those domains:\n${offBrand}`,
    "Decide whether this is that company or an impersonator, per BRAND AUTHENTICITY.",
  ].join("\n");
}

export function buildModerationUserContent(
  snapshot: ModerationKyteSnapshot,
  context: ModerationReviewContext = {},
): Array<OpenAI.Chat.Completions.ChatCompletionContentPart> {
  const advisory = context.advisory ?? [];
  const linksText = snapshot.links.length
    ? snapshot.links.map((link) => `- "${link.title}" -> ${link.url}`).join("\n")
    : "(no links)";
  const iconUrls = snapshot.icons.map((icon) => icon.url).filter((url): url is string => Boolean(url));
  const iconsText = iconUrls.length ? iconUrls.join(", ") : "(no icons)";
  const advisoryText = advisory.length
    ? advisory.map((signal) => `- ${signal.key}: ${signal.detail}`).join("\n")
    : "(none)";

  const text = [
    `username: ${snapshot.username ?? "(none)"}`,
    `displayName: ${snapshot.displayName ?? "(none)"}`,
    `description: ${snapshot.description ?? "(none)"}`,
    `links:\n${linksText}`,
    `icon urls: ${iconsText}`,
    `redirectUrl: ${snapshot.redirectUrl ?? "(none)"}`,
    context.deterministicHits?.length ? deterministicBlock(context.deterministicHits) : null,
    context.brandClaim ? brandClaimBlock(context.brandClaim) : null,
    `advisory context (weak background, never sufficient on its own):\n${advisoryText}`,
  ]
    .filter((part): part is string => part !== null)
    .join("\n\n");

  const parts: Array<OpenAI.Chat.Completions.ChatCompletionContentPart> = [{ type: "text", text }];
  if (snapshot.avatarUrl) {
    parts.push({ type: "image_url", image_url: { url: snapshot.avatarUrl } });
  }
  return parts;
}
