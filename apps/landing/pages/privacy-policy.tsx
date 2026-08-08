import { NextSeo } from "next-seo";
import { PageShell } from "../components/layout/page-shell";
import { Section } from "../components/ui/section";
import { LegalContent } from "../components/legal/legal-content";
import { LegalDocumentJsonLd } from "../components/seo/json-ld";
import { privacyPolicy } from "../lib/legal/privacy";
import { buildPageSeo } from "../lib/seo/build-page-seo";
import { KYTELINK_ORIGIN } from "@kytelink/ui";

export function PrivacyPolicyPage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/privacy-policy",
          title: "Privacy policy",
          description: "What Kytelink collects, why, and how to export or delete your data.",
        })}
      />
      <LegalDocumentJsonLd
        name="Kytelink privacy policy"
        url={`${KYTELINK_ORIGIN}/privacy-policy`}
        dateModified={privacyPolicy.lastUpdated}
      />
      <PageShell>
        <Section>
          <LegalContent document={privacyPolicy} />
        </Section>
      </PageShell>
    </>
  );
}

export default PrivacyPolicyPage;
