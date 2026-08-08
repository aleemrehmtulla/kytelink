import { NextSeo } from "next-seo";
import { KYTELINK_ORIGIN } from "@kytelink/ui";
import { PageShell } from "../components/layout/page-shell";
import { Section } from "../components/ui/section";
import { LegalContent } from "../components/legal/legal-content";
import { AntiPhishingFlow } from "../components/legal/anti-phishing-flow";
import { BreadcrumbJsonLd, FaqJsonLd, LegalDocumentJsonLd } from "../components/seo/json-ld";
import { FaqSection } from "../components/seo/seo-sections";
import type { FaqEntry } from "../components/seo/json-ld";
import { antiPhishingStatement, ANTI_PHISHING_FLOW_SLOT } from "../lib/legal/anti-phishing";
import { buildPageSeo } from "../lib/seo/build-page-seo";

const FAQS: FaqEntry[] = [
  {
    question: "Is Kytelink safe to click?",
    answer:
      "Every page published on kytelink.com is reviewed on every publish — not only the first one. Deterministic phishing checks run first and suspend confident matches instantly; anything that clears them goes through an AI review of the profile text, every link, the redirect target, and the avatar. Any suspension is then reviewed by a person. Treat a link the way you would any link on the open web: Kytelink never asks for your password, banking details, or account-recovery codes, and a Kytelink page that does is phishing — report it.",
  },
  {
    question: "Did Kytelink have a phishing problem?",
    answer:
      "Yes. The first version of Kytelink was abused at volume for phishing, mostly pages impersonating telecom providers, internet providers, banks, delivery companies, and crypto exchanges. Moderation was reactive: pages went live unchecked and stayed live until reported, and nothing re-checked a page that was edited into a phishing page after publishing. The product has since been rebuilt from the ground up with review built into the publish path.",
  },
  {
    question: "How does Kytelink detect phishing pages?",
    answer:
      "In two automated stages plus a human one. Stage one is deterministic: brand impersonation keywords, lookalike and punycode domains, homoglyph and near-miss spellings of known brand domains, a blocklist of IP-logger services, link shorteners, high-abuse TLDs, and account-level mismatches. Stage two is a multimodal AI review that returns a schema-enforced verdict with categories, confidence, a written reason, and the signals that fired. Stage three is a person, who reviews every suspension.",
  },
  {
    question: "Can a page be taken down permanently and automatically?",
    answer:
      "No. Suspension is the only enforcement outcome, it is reversible, and it preserves all data. Automation can suspend a page; only a human reviewer decides whether the suspension stands, and only a human reviewer can lift it — never a cache hit, a re-publish, or any action the page owner takes on their own. A suspended account can still sign in; it is read-only, not locked out.",
  },
  {
    question: "How do I appeal a suspended Kytelink page?",
    answer:
      "Use the form at kytelink.com/appeal — no account needed, and it covers a suspended page, organization, or account. It is the same appeal path shown on the suspended page, in the editor banner, and in the suspension email, a person reads every one, and we answer fast. If the suspension was wrong, the page is restored with its content, links, and analytics intact.",
  },
  {
    question: "How do I report a phishing or scam Kytelink page?",
    answer:
      "Report it at kytelink.com/report — no account needed. Reports never automatically suspend a page; they open a case in the same human review queue where a reviewer decides. The form gives the same neutral response no matter what you submit and will not confirm whether a username exists.",
  },
  {
    question: "Does this apply to self-hosted Kytelink instances?",
    answer:
      "No. This statement covers the hosted service at kytelink.com only. Kytelink is MIT-licensed open source, and self-hosted copies ship with the review provider off by default and are operated entirely by whoever runs them.",
  },
];

export function AntiPhishingPage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/anti-phishing",
          title: "Anti-phishing statement",
          description:
            "Kytelink's official anti-phishing statement: what went wrong in the first version, and exactly how every page is now reviewed — deterministic checks, AI review, and a human gate on every suspension.",
        })}
      />
      <LegalDocumentJsonLd
        name="Kytelink anti-phishing statement"
        url={`${KYTELINK_ORIGIN}/anti-phishing`}
        dateModified={antiPhishingStatement.lastUpdated}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Legal", path: "/legal" },
          { name: "Anti-phishing statement", path: "/anti-phishing" },
        ]}
      />
      <FaqJsonLd faqs={FAQS} />
      <PageShell>
        <Section>
          <LegalContent
            document={antiPhishingStatement}
            slots={{ [ANTI_PHISHING_FLOW_SLOT]: <AntiPhishingFlow /> }}
          />
        </Section>
        <FaqSection faqs={FAQS} />
      </PageShell>
    </>
  );
}

export default AntiPhishingPage;
