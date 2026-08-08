import { NextSeo } from "next-seo";
import { PageShell } from "../layout/page-shell";
import { UseCaseHero } from "./use-case-hero";
import { CtaBand } from "../ui/cta-band";
import { BreadcrumbJsonLd, FaqJsonLd, type FaqEntry } from "../seo/json-ld";
import { FaqSection, LongformSections, type ContentSection } from "../seo/seo-sections";
import type { UseCaseMeta } from "../../consts/use-cases";
import { buildPageSeo } from "../../lib/seo/build-page-seo";

export function UseCasePageLayout({
  useCase,
  sections,
  faqs,
  ctaSubtitle,
}: {
  useCase: UseCaseMeta;
  sections: ContentSection[];
  faqs: FaqEntry[];
  ctaSubtitle: string;
}) {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: `/use-cases/${useCase.slug}`,
          title: useCase.seoTitle,
          description: useCase.seoDescription,
        })}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: useCase.title, path: `/use-cases/${useCase.slug}` },
        ]}
      />
      <FaqJsonLd faqs={faqs} />
      <PageShell>
        <UseCaseHero headline={useCase.headline} story={useCase.story} />
        <LongformSections sections={sections} />
        <FaqSection faqs={faqs} />
        <CtaBand title="Ready to build your kyte?" subtitle={ctaSubtitle} />
      </PageShell>
    </>
  );
}
