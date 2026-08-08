import { KYTELINK_ORIGIN } from "@kytelink/ui";
import { getCdnUrl } from "@kytelink/cdn";
import { GITHUB_REPO_URL, ALEEM_TWITTER_URL } from "../../consts/site";

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
          logo: getCdnUrl("logos/icon.svg"),
          sameAs: [GITHUB_REPO_URL, ALEEM_TWITTER_URL],
        }}
      />
    </>
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
          item: `${KYTELINK_ORIGIN}${item.path}`,
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
