import { FeaturePageLayout } from "../../components/features-pages/feature-page-layout";
import { DnsFlowMock } from "../../components/features-pages/custom-domains/dns-flow-mock";
import { DomainPreviewMock } from "../../components/features-pages/custom-domains/domain-preview-mock";
import { getFeature } from "../../consts/features";

const feature = getFeature("custom-domains");

const bullets = [
  {
    title: "Free, on any plan",
    description: "Connect a domain you already own — no upsell, no extra tier.",
  },
  {
    title: "Clear DNS instructions",
    description: "Two records, copy-paste ready. No dashboards to fight with.",
  },
  {
    title: "Verified automatically",
    description: "We watch your DNS and switch the domain on the moment it points at us.",
  },
];

const sections = [
  {
    heading: "Your own domain, on the free plan",
    paragraphs: [
      "A custom domain turns yourname.com into your link-in-bio. It looks better under a video, reads better on a business card, and builds trust that a shared URL never will — visitors know exactly whose page they're on.",
      "Kytelink doesn't treat that as a premium upsell. Connecting a domain you already own is free, on every account, forever.",
    ],
  },
  {
    heading: "Two DNS records and you're live",
    paragraphs: [
      "Point an A record at Kytelink and add a CNAME for www — both values are shown copy-paste ready in your settings. Once DNS propagates, HTTPS is provisioned automatically; there's nothing to renew and no certificate to babysit.",
      "Your kytelink.com/yourname URL keeps working too, so nothing you've already posted ever breaks.",
    ],
  },
  {
    heading: "Works self-hosted, too",
    paragraphs: [
      "Running Kytelink on your own server? Your users get the same thing: the same DNS instructions, the same automatic verification, and certificates issued on demand for every domain they connect. A shipped Caddy config does it in about ten lines. Open source means the feature ships everywhere, not just on our infrastructure.",
    ],
  },
];

const faqs = [
  {
    question: "Is a custom domain really free on Kytelink?",
    answer:
      "Yes. Connecting a domain you own is included on every account. You pay your domain registrar for the domain itself — Kytelink charges nothing to use it.",
  },
  {
    question: "What DNS records do I need to add?",
    answer:
      "Two: an A record on your root domain pointing at Kytelink, and a CNAME on www. Both exact values are shown in your settings, ready to paste into your registrar.",
  },
  {
    question: "Do I get HTTPS on my custom domain?",
    answer:
      "Yes. An SSL certificate is provisioned automatically once your DNS records are verified — no setup, no renewals.",
  },
  {
    question: "Can I use a subdomain like links.mysite.com?",
    answer: "Yes. Point a CNAME from any subdomain you like and it works the same way.",
  },
  {
    question: "What happens to my kytelink.com URL?",
    answer:
      "It keeps working alongside your domain, so old bios and posted links never break.",
  },
  {
    question: "How long until my domain goes live?",
    answer:
      "Usually a few minutes, though DNS can take up to a few hours to propagate worldwide. The moment Kytelink sees your records, verification passes and HTTPS is provisioned for you.",
  },
];

export function CustomDomainsFeaturePage() {
  return (
    <FeaturePageLayout
      feature={feature}
      bullets={bullets}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Bring your own domain, free."
      mockups={
        <>
          <DnsFlowMock />
          <DomainPreviewMock />
        </>
      }
    />
  );
}

export default CustomDomainsFeaturePage;
