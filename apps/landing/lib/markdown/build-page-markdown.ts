import {
  GITHUB_REPO_URL,
  HOME_DESCRIPTION,
  HOME_TITLE,
  PRODUCT_FEATURES,
  SIGNUP_URL,
  WEB_BASE_URL,
} from "../../consts/site";
import { FEATURES, type FeatureMeta } from "../../consts/features";
import { USE_CASES, type UseCaseMeta } from "../../consts/use-cases";
import { COMPETITORS, type CompetitorMeta } from "../../consts/competitors";
import { PRICING_FAQS } from "../../consts/pricing";
import { QUICK_START } from "../../consts/self-hosting";
import {
  ABOUT_HEADLINE,
  ABOUT_PARAGRAPHS,
  APPEAL_HEADLINE,
  APPEAL_INTRO,
  CONTACT_CHANNELS,
  CONTACT_HEADLINE,
  CONTACT_INTRO,
  REPORT_HEADLINE,
  REPORT_INTRO,
} from "../../consts/company";
import { termsOfService } from "../legal/terms";
import { privacyPolicy } from "../legal/privacy";
import { antiPhishingStatement } from "../legal/anti-phishing";
import type { LegalDocument } from "../legal/types";

const abs = (path: string): string => `${WEB_BASE_URL}${path}`;

const FOOTER_LINKS = [
  `[Create your kyte](${SIGNUP_URL}) · [Source on GitHub](${GITHUB_REPO_URL}) · [Full site index](${abs("/llms.txt")})`,
];

function page(title: string, body: string[]): string {
  return [`# ${title}`, "", ...body, "", "---", "", ...FOOTER_LINKS, ""].join("\n");
}

function homeMarkdown(): string {
  return page(`Kytelink — ${HOME_TITLE}`, [
    `> ${HOME_DESCRIPTION}`,
    "",
    "Every feature is free forever — there is no paid tier, no trial, and nothing held back behind an upgrade. The whole stack is MIT-licensed and self-hostable.",
    "",
    "## Features",
    "",
    ...FEATURES.map(
      (feature) =>
        `- [${feature.title}](${abs(`/features/${feature.slug}`)}): ${feature.cardDescription}`,
    ),
    "",
    "## Explore",
    "",
    `- [Pricing](${abs("/pricing")}): free, forever, no catch.`,
    `- [Self-hosting](${abs("/self-hosting")}): run your own instance in three commands.`,
    `- [Compare](${abs("/compare")}): Kytelink next to every major link-in-bio tool.`,
    `- [About](${abs("/about")}): who builds this and why it's free.`,
    `- [Contact](${abs("/contact")}): reach a person, not a portal.`,
  ]);
}

function featureMarkdown(feature: FeatureMeta): string {
  return page(feature.title, [
    `> ${feature.tagline}`,
    "",
    feature.seoDescription,
    "",
    feature.cardDescription,
  ]);
}

function useCaseMarkdown(useCase: UseCaseMeta): string {
  return page(`Kytelink for ${useCase.title.toLowerCase()}`, [
    `> ${useCase.headline}`,
    "",
    useCase.story,
  ]);
}

function compareCell(value: string | boolean): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return value;
}

function compareMarkdown(competitor: CompetitorMeta): string {
  return page(`Kytelink vs ${competitor.name}`, [
    `> ${competitor.headline}`,
    "",
    competitor.story,
    "",
    `| | Kytelink | ${competitor.name} |`,
    "| --- | --- | --- |",
    ...competitor.rows.map(
      (row) =>
        `| ${row.label} | ${compareCell(row.kytelink)} | ${compareCell(row.competitor)} |`,
    ),
    "",
    `*${competitor.tableFootnote}*`,
  ]);
}

function compareHubMarkdown(): string {
  return page("Compare Kytelink", [
    "> Honest comparisons of Kytelink against every major link-in-bio tool — pricing, domains, analytics, and lock-in.",
    "",
    ...COMPETITORS.map(
      (competitor) =>
        `- [Kytelink vs ${competitor.name}](${abs(`/compare/${competitor.slug}`)}): ${competitor.hubBlurb}`,
    ),
  ]);
}

function pricingMarkdown(): string {
  return page("Pricing — it's free", [
    '> $0, forever. Every feature, for everyone. Not "free tier" free. Just free.',
    "",
    "Included at no cost:",
    "",
    ...PRODUCT_FEATURES.map((feature) => `- ${feature}`),
    "",
    "## Frequently asked questions",
    "",
    ...PRICING_FAQS.flatMap((faq) => [`### ${faq.question}`, "", faq.answer, ""]),
  ]);
}

function selfHostingMarkdown(): string {
  return page("Self-hosting Kytelink", [
    "> Run your own Kytelink in three commands. Every hosted service has a drop-in open-source equivalent.",
    "",
    "```bash",
    ...QUICK_START.map((line) => line.text),
    "```",
    "",
    `The full environment-variable reference and capability matrix live in [SELF-HOSTING.md](${GITHUB_REPO_URL}/blob/main/SELF-HOSTING.md).`,
  ]);
}

function legalDocMarkdown(doc: LegalDocument): string {
  return page(doc.title, [
    `*Last updated ${doc.lastUpdated}*`,
    "",
    doc.intro,
    "",
    ...doc.sections.flatMap((section) => [
      `## ${section.heading}`,
      "",
      ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]),
      ...(section.bullets ?? []).map((bullet) => `- ${bullet}`),
      ...(section.bullets?.length ? [""] : []),
    ]),
  ]);
}

function legalHubMarkdown(): string {
  return page("Legal", [
    "> Three short documents. Plain English, no filler.",
    "",
    `- [${termsOfService.title}](${abs("/terms-of-service")}): last updated ${termsOfService.lastUpdated}.`,
    `- [${privacyPolicy.title}](${abs("/privacy-policy")}): last updated ${privacyPolicy.lastUpdated}.`,
    `- [${antiPhishingStatement.title}](${abs("/anti-phishing")}): last updated ${antiPhishingStatement.lastUpdated}.`,
  ]);
}

function aboutMarkdown(): string {
  return page("About Kytelink", [
    `> ${ABOUT_HEADLINE}`,
    "",
    ...ABOUT_PARAGRAPHS.flatMap((paragraph) => [paragraph, ""]),
    `Get in touch on the [contact page](${abs("/contact")}).`,
  ]);
}

function contactMarkdown(): string {
  return page("Contact Kytelink", [
    `> ${CONTACT_HEADLINE}`,
    "",
    CONTACT_INTRO,
    "",
    ...CONTACT_CHANNELS.flatMap((channel) => {
      const href = channel.href.startsWith("/") ? abs(channel.href) : channel.href;
      return [
        `## ${channel.title}`,
        "",
        channel.description,
        "",
        `[${channel.linkLabel}](${href})`,
        "",
      ];
    }),
  ]);
}

function reportMarkdown(): string {
  return page("Report abuse", [
    `> ${REPORT_HEADLINE}`,
    "",
    REPORT_INTRO,
    "",
    `The report form lives at [${abs("/report")}](${abs("/report")}) — it asks for the page's URL and what's wrong. How reviews and suspensions work is documented in the [anti-phishing statement](${abs("/anti-phishing")}).`,
  ]);
}

function appealMarkdown(): string {
  return page("Appeal a suspension", [
    `> ${APPEAL_HEADLINE}`,
    "",
    APPEAL_INTRO,
    "",
    `The appeal form lives at [${abs("/appeal")}](${abs("/appeal")}). How reviews and suspensions work is documented in the [anti-phishing statement](${abs("/anti-phishing")}).`,
  ]);
}

const PAGE_BUILDERS: Record<string, () => string> = {
  "/": homeMarkdown,
  "/about": aboutMarkdown,
  "/contact": contactMarkdown,
  "/pricing": pricingMarkdown,
  "/self-hosting": selfHostingMarkdown,
  "/compare": compareHubMarkdown,
  "/legal": legalHubMarkdown,
  "/terms-of-service": () => legalDocMarkdown(termsOfService),
  "/privacy-policy": () => legalDocMarkdown(privacyPolicy),
  "/anti-phishing": () => legalDocMarkdown(antiPhishingStatement),
  "/report": reportMarkdown,
  "/appeal": appealMarkdown,
  ...Object.fromEntries(
    FEATURES.map((feature) => [
      `/features/${feature.slug}`,
      () => featureMarkdown(feature),
    ]),
  ),
  ...Object.fromEntries(
    USE_CASES.map((useCase) => [
      `/use-cases/${useCase.slug}`,
      () => useCaseMarkdown(useCase),
    ]),
  ),
  ...Object.fromEntries(
    COMPETITORS.map((competitor) => [
      `/compare/${competitor.slug}`,
      () => compareMarkdown(competitor),
    ]),
  ),
};

export const MARKDOWN_PAGE_PATHS: readonly string[] = Object.keys(PAGE_BUILDERS);

export function normalizeMarkdownPath(rawPath: string): string {
  const path = rawPath.split("?")[0]?.trim() ?? "";
  if (path === "" || path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

export function buildPageMarkdown(rawPath: string): string | null {
  const builder = PAGE_BUILDERS[normalizeMarkdownPath(rawPath)];
  return builder ? builder() : null;
}

export function buildNotFoundMarkdown(rawPath: string): string {
  return [
    "# 404 — nothing here",
    "",
    `There is no page at \`${normalizeMarkdownPath(rawPath)}\`. It may have drifted off, or it never existed.`,
    "",
    "Where to look instead:",
    "",
    `- [Home](${abs("/")}): what Kytelink is and every feature.`,
    `- [llms.txt](${abs("/llms.txt")}): a full index of this site for agents.`,
    `- [Sitemap](${abs("/sitemap.xml")}): every indexable URL.`,
    `- [Contact](${abs("/contact")}): reach a person if you're stuck.`,
    "",
  ].join("\n");
}
