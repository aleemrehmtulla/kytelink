import type { ReactNode } from "react";
import { NextSeo } from "next-seo";
import { PageShell } from "../layout/page-shell";
import { FeatureHero } from "./feature-hero";
import { FeatureBullets, type FeatureBullet } from "./feature-bullets";
import { CtaBand } from "../ui/cta-band";
import { Section } from "../ui/section";
import { BreadcrumbJsonLd, FaqJsonLd, type FaqEntry } from "../seo/json-ld";
import { FaqSection, LongformSections, type ContentSection } from "../seo/seo-sections";
import type { FeatureMeta } from "../../consts/features";
import { buildPageSeo } from "../../lib/seo/build-page-seo";

export function FeaturePageLayout({
  feature,
  mockups,
  bullets,
  sections,
  faqs,
  ctaSubtitle,
}: {
  feature: FeatureMeta;
  mockups: ReactNode;
  bullets: FeatureBullet[];
  sections: ContentSection[];
  faqs: FaqEntry[];
  ctaSubtitle: string;
}) {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: `/features/${feature.slug}`,
          title: feature.seoTitle,
          description: feature.seoDescription,
        })}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: feature.title, path: `/features/${feature.slug}` },
        ]}
      />
      <FaqJsonLd faqs={faqs} />
      <PageShell>
        <FeatureHero title={feature.tagline} tagline={feature.cardDescription} />
        <Section className="pt-0 sm:pt-0">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">{mockups}</div>
        </Section>
        <FeatureBullets bullets={bullets} />
        <LongformSections sections={sections} />
        <FaqSection faqs={faqs} />
        <CtaBand title="Ready to build your kyte?" subtitle={ctaSubtitle} />
      </PageShell>
    </>
  );
}
