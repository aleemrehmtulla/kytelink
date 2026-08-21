import { KYTELINK_ORIGIN, SEO_DEFAULT_DESCRIPTION } from "@kytelink/ui";
import { getCdnUrl } from "@kytelink/cdn";
import { GITHUB_REPO_URL, ALEEM_TWITTER_URL, PRODUCT_FEATURES } from "../../consts/site";
import { DEFAULT_OG_IMAGE } from "../../lib/seo/build-page-seo";

function JsonLdScript({ id, data }: { id: string; data: Record<string, unknown> }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebsiteOrganizationJsonLd() {
  return (
    <>
      <JsonLdScript
        id="ld-website"
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Kytelink",
          url: KYTELINK_ORIGIN,
        }}
      />
      <JsonLdScript
        id="ld-organization"
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Kytelink",
          url: KYTELINK_ORIGIN,
          logo: getCdnUrl("logos/icon.png"),
          sameAs: [GITHUB_REPO_URL, ALEEM_TWITTER_URL],
        }}
      />
    </>
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLdScript
      id="ld-software-application"
      data={{
        "@context": "https://schema.org",
        "@type": ["SoftwareApplication", "WebApplication"],
        "@id": `${KYTELINK_ORIGIN}#software`,
        name: "Kytelink",
        applicationCategory: "SocialNetworkingApplication",
        applicationSubCategory: "Link in bio",
        operatingSystem: "Any",
        url: KYTELINK_ORIGIN,
        description: SEO_DEFAULT_DESCRIPTION,
        image: DEFAULT_OG_IMAGE,
        isAccessibleForFree: true,
        license: `${GITHUB_REPO_URL}/blob/main/LICENSE`,
        featureList: PRODUCT_FEATURES,
        sameAs: [GITHUB_REPO_URL],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      }}
    />
  );
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return (
    <JsonLdScript
      id="ld-breadcrumb"
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.path === "/" ? KYTELINK_ORIGIN : `${KYTELINK_ORIGIN}${item.path}`,
        })),
      }}
    />
  );
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export function FaqJsonLd({ faqs }: { faqs: FaqEntry[] }) {
  return (
    <JsonLdScript
      id="ld-faq"
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }}
    />
  );
}

export function LegalDocumentJsonLd({
  name,
  url,
  dateModified,
}: {
  name: string;
  url: string;
  dateModified: string;
}) {
  return (
    <JsonLdScript
      id="ld-legal-document"
      data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name,
        url,
        dateModified,
        isPartOf: { "@type": "WebSite", name: "Kytelink", url: KYTELINK_ORIGIN },
      }}
    />
  );
}

export function HowToJsonLd({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: string[];
}) {
  return (
    <JsonLdScript
      id="ld-how-to"
      data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        step: steps.map((text, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text,
        })),
      }}
    />
  );
}
