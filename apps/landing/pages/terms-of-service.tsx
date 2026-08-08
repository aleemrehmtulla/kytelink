import { NextSeo } from "next-seo";
import { PageShell } from "../components/layout/page-shell";
import { Section } from "../components/ui/section";
import { LegalContent } from "../components/legal/legal-content";
import { LegalDocumentJsonLd } from "../components/seo/json-ld";
import { termsOfService } from "../lib/legal/terms";
import { buildPageSeo } from "../lib/seo/build-page-seo";
import { KYTELINK_ORIGIN } from "@kytelink/ui";

export function TermsOfServicePage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/terms-of-service",
          title: "Terms of service",
          description: "The terms for using Kytelink's hosted service at kytelink.com.",
        })}
      />
      <LegalDocumentJsonLd
        name="Kytelink terms of service"
        url={`${KYTELINK_ORIGIN}/terms-of-service`}
        dateModified={termsOfService.lastUpdated}
      />
      <PageShell>
        <Section>
          <LegalContent document={termsOfService} />
        </Section>
      </PageShell>
    </>
  );
}

export default TermsOfServicePage;
