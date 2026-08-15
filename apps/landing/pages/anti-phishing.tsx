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
      "Every page published on kytelink.com is reviewed on every publish — not only the first one. A short set of deterministic phishing checks runs first and suspends a match instantly; anything that clears them goes through an AI review of the profile text, every link, the redirect target, and the avatar. Any suspension is then reviewed by a person. Treat a link the way you would any link on the open web: Kytelink never asks for your password, banking details, or account-recovery codes, and a Kytelink page that does is phishing — report it.",
  },
  {
    question: "Did Kytelink have a phishing problem?",
    answer:
      "Yes. The first version of Kytelink was abused at volume for phishing, mostly pages impersonating telecom providers, internet providers, banks, delivery companies, and crypto exchanges. Moderation was reactive: pages went live unchecked and stayed live until reported, and nothing re-checked a page that was edited into a phishing page after publishing. The product has since been rebuilt from the ground up with review built into the publish path.",
  },
  {
    question: "How does Kytelink detect phishing pages?",
    answer:
      "In two automated stages plus a human one. Stage one is deterministic and deliberately narrow — two checks, and nothing else there can suspend a page: a link pointing at a known IP-logger service, and a lookalike of a major brand's domain (punycode decoded, homoglyph substitutions, one-character typosquats, or a brand name glued to a capture word, like apple-support.com standing in for apple.com). Stage two is a multimodal AI review of the profile text, every link, the redirect target, and the avatar, returning a schema-enforced verdict with categories, confidence, a written reason, and the signals that fired — and its suspension only applies if the confidence clears a threshold, so an unsure verdict approves and is logged instead. Stage three is a person, who reviews every suspension.",
  },
  {
    question: "What if my company's real support page gets flagged?",
    answer:
      "It gets verified, not banned. No automated check suspends a page for naming a company — big companies are welcome here, and some of them use Kytelink. A page presenting itself as a large company's support or account-recovery desk is flagged for a mandatory AI review that cannot be skipped or served from cache, runs on the stronger of our two models, and is handed that brand's official domains to compare against. If your links resolve to your own domains, you are approved. What gets suspended is the opposite shape: a page claiming to be a company while sending visitors off to a login, payment, or verification page that company does not own, a number to call, or a chat handle to message.",
  },
  {
    question: "What will not get a Kytelink page suspended?",
    answer:
      "Ordinary business pages, which is nearly all of them: clinics, dental and medical practices, schools, local trades, agencies, restaurants, and startups running their own support page under their own name. A crypto wallet address or token link on its own. A Gmail or other free-mail address as your contact or support address. A link shortener, an unusual domain ending, a one-link page, a non-English page, affiliate marketing, or a big brand's name — mentioned because you resell, repair, or review it, or because the brand is you. Those are context a reviewer can see, never grounds for an automatic suspension on their own. The automated layer suspends for two things only: impersonating a large company's support or account-recovery channel, and explicit sexual content.",
  },
  {
    question: "Can a page be taken down permanently and automatically?",
    answer:
      "No. Suspension is the only enforcement outcome, it is reversible, and it preserves all data. Automation can suspend a page; only a human reviewer decides whether the suspension stands, and only a human reviewer can lift it — never a cache hit, a re-publish, or any action the page owner takes on their own. It lifts in exactly two ways, both started by a person: a reviewer restores the page, or a reviewer re-runs the review from the admin tools and it comes back clean. A suspended account can still sign in; it is read-only, not locked out.",
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
