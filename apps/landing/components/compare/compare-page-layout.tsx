import Link from "next/link";
import { NextSeo } from "next-seo";
import { PageShell } from "../layout/page-shell";
import { CompareHero } from "./compare-hero";
import { CompareTable } from "./compare-table";
import { CtaBand } from "../ui/cta-band";
import { Section } from "../ui/section";
import { BreadcrumbJsonLd, FaqJsonLd, type FaqEntry } from "../seo/json-ld";
import { FaqSection, LongformSections, type ContentSection } from "../seo/seo-sections";
import { COMPETITORS, type CompetitorMeta } from "../../consts/competitors";
import { buildPageSeo } from "../../lib/seo/build-page-seo";

function MoreComparisons({ current }: { current: CompetitorMeta }) {
  return (
    <Section className="border-t border-hairline">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight text-ink">More comparisons</h2>
          <Link
            href="/compare"
            className="cursor-pointer whitespace-nowrap text-[13px] font-medium text-accent outline-none transition-colors hover:text-accent-hover"
          >
            All comparisons →
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {COMPETITORS.filter((item) => item.slug !== current.slug).map((item) => (
            <Link
              key={item.slug}
              href={`/compare/${item.slug}`}
              className="cursor-pointer rounded-pill border border-cardline bg-white px-4 py-2 text-[13px] text-secondary outline-none transition-colors hover:border-accent-border hover:text-ink"
            >
              Kytelink vs {item.name}
            </Link>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function ComparePageLayout({
  competitor,
  sections,
  faqs,
  ctaSubtitle,
}: {
  competitor: CompetitorMeta;
  sections: ContentSection[];
  faqs: FaqEntry[];
  ctaSubtitle: string;
}) {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: `/compare/${competitor.slug}`,
          title: competitor.seoTitle,
          description: competitor.seoDescription,
        })}
        titleTemplate="%s"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
          { name: `Kytelink vs ${competitor.name}`, path: `/compare/${competitor.slug}` },
        ]}
      />
      <FaqJsonLd faqs={faqs} />
      <PageShell>
        <CompareHero
          eyebrow={`Kytelink vs ${competitor.name}`}
          headline={competitor.headline}
          story={competitor.story}
        />
        <CompareTable
          competitorName={competitor.name}
          rows={competitor.rows}
          footnote={competitor.tableFootnote}
        />
        <LongformSections sections={sections} />
        <FaqSection faqs={faqs} />
        <MoreComparisons current={competitor} />
        <CtaBand title="Ready to build your kyte?" subtitle={ctaSubtitle} />
      </PageShell>
    </>
  );
}
