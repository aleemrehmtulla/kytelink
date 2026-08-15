import Link from "next/link";
import { NextSeo } from "next-seo";
import { PageShell } from "../../components/layout/page-shell";
import { CompareHero } from "../../components/compare/compare-hero";
import { CtaBand } from "../../components/ui/cta-band";
import { Section } from "../../components/ui/section";
import { BreadcrumbJsonLd, FaqJsonLd, type FaqEntry } from "../../components/seo/json-ld";
import { FaqSection, LongformSections } from "../../components/seo/seo-sections";
import { COMPETITORS } from "../../consts/competitors";
import { buildPageSeo } from "../../lib/seo/build-page-seo";

const sections = [
  {
    heading: "Why open source is the real alternative",
    paragraphs: [
      "Every link-in-bio tool offers the same core page: your links, a theme, some analytics. The differences are in the pricing: which features sit in which tier, what fees apply when you sell, and what options you have if you ever want to move.",
      "Kytelink's answer is to have no pricing at all. The entire platform is open source, built and hosted by Aleem as a passion project: every feature is free on the hosted version, the code is public on GitHub, your page exports as JSON, and you can run the whole thing on your own server. There's no tier to protect, so there's nothing to hold back.",
    ],
  },
  {
    heading: "How to read these comparisons",
    paragraphs: [
      "Each page is honest about where the other tool wins — Beacons has a real store, Carrd is a better freeform designer, Lnk.bio's pricing is genuinely fair. If those are the features you need, use them; they're good products.",
      "The comparisons focus on what a link-in-bio actually needs — custom domains, per-link analytics, scheduling, teams, and an exit door — and what each tool charges for them. Pricing is checked against the vendors and dated on every table.",
    ],
  },
];

const faqs: FaqEntry[] = [
  {
    question: "What is the best open-source Linktree alternative?",
    answer:
      "Kytelink — a fully open-source link-in-bio with free custom domains, analytics, scheduling, and teams. Self-host it or use the hosted version at kytelink.com, both with every feature.",
  },
  {
    question: "Is Kytelink really 100% free?",
    answer:
      "Yes. There is no paid tier, no trial, and no feature gate. Kytelink is an open-source passion project built and hosted by Aleem — the hosted service and the self-hosted code are the same product.",
  },
  {
    question: "How is Kytelink different from LinkStack or LittleLink?",
    answer:
      "Both are good open-source projects. LittleLink is a static template you edit by hand; LinkStack is a PHP app whose hosted plans are paid. Kytelink pairs open source with a free hosted version, a full web editor, analytics, scheduling, and teams.",
  },
  {
    question: "Can I move my existing link page to Kytelink?",
    answer:
      "Yes — pages rebuild in minutes: add your links, pick a theme, connect your domain, and update your bios. No importer needed for a page of links.",
  },
  {
    question: "Does Kytelink take fees on sales?",
    answer:
      "Never. Kytelink has no checkout and no transaction fees — it links out to whatever store or payment tool you already use.",
  },
  {
    question: "What if Kytelink shuts down someday?",
    answer:
      "Your page exports as JSON and the full source code is public, so it can live on your own server no matter what. That's a guarantee closed platforms can't make.",
  },
];

export function CompareIndexPage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/compare",
          title: "Compare Kytelink — the open-source link-in-bio alternative",
          description:
            "Honest comparisons of Kytelink vs Linktree, Beacons, Carrd, Lnk.bio, Milkshake, Bio Sites, LinkStack & LittleLink — pricing, domains, analytics, lock-in.",
        })}
        titleTemplate="%s"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
        ]}
      />
      <FaqJsonLd faqs={faqs} />
      <PageShell>
        <CompareHero
          eyebrow="Comparisons"
          headline="One open-source alternative to all of them"
          story="Honest, dated, side-by-side comparisons — what each link-in-bio tool charges for (or leaves out), and what Kytelink simply includes."
        />
        <Section className="pt-0 sm:pt-0">
          <div className="mx-auto grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMPETITORS.map((competitor) => (
              <Link
                key={competitor.slug}
                href={`/compare/${competitor.slug}`}
                className="flex h-full cursor-pointer flex-col rounded-[18px] border border-hairline bg-canvas px-[22px] py-6 outline-none transition-colors hover:border-accent-border hover:bg-accent-soft/40"
              >
                <span className="text-[15px] font-semibold tracking-tight text-ink">
                  Kytelink vs {competitor.name}
                </span>
                <span className="mt-2 text-[13px] leading-relaxed text-secondary">
                  {competitor.hubBlurb}
                </span>
                <span className="mt-4 text-[13px] font-medium text-accent">
                  Read the comparison →
                </span>
              </Link>
            ))}
          </div>
        </Section>
        <LongformSections sections={sections} />
        <FaqSection faqs={faqs} />
        <CtaBand
          title="Ready to build your kyte?"
          subtitle="Every feature on these pages, free forever."
        />
      </PageShell>
    </>
  );
}

export default CompareIndexPage;
