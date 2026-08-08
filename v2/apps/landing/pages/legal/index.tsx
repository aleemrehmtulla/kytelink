import { NextSeo } from "next-seo";
import { motion } from "framer-motion";
import { ArrowUpRight, FileText, Shield, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { PageShell } from "../../components/layout/page-shell";
import { Section, Eyebrow } from "../../components/ui/section";
import { listItemMotion } from "@kytelink/ui";
import { termsOfService } from "../../lib/legal/terms";
import { privacyPolicy } from "../../lib/legal/privacy";
import { antiPhishingStatement } from "../../lib/legal/anti-phishing";
import { buildPageSeo } from "../../lib/seo/build-page-seo";

const DOCUMENTS = [
  {
    href: "/terms-of-service",
    icon: FileText,
    title: termsOfService.title,
    description: "What you can do on Kytelink, and what we can do about abuse.",
    lastUpdated: termsOfService.lastUpdated,
  },
  {
    href: "/privacy-policy",
    icon: Shield,
    title: privacyPolicy.title,
    description: "What we collect, why, and how to export or delete it.",
    lastUpdated: privacyPolicy.lastUpdated,
  },
  {
    href: "/anti-phishing",
    icon: ShieldAlert,
    title: antiPhishingStatement.title,
    description: "How every published page is reviewed, and who decides.",
    lastUpdated: antiPhishingStatement.lastUpdated,
  },
];

export function LegalHubPage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/legal",
          title: "Legal",
          description: "Kytelink's terms of service and privacy policy.",
        })}
      />
      <PageShell>
        <Section>
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">The fine print</h1>
          <p className="mt-3 max-w-xl text-secondary">
            Three short documents. Plain English, no filler.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOCUMENTS.map((doc, index) => {
              const Icon = doc.icon;
              return (
              <motion.div
                key={doc.href}
                variants={listItemMotion}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={doc.href}
                  aria-label={`Read the ${doc.title}`}
                  className="group flex h-full cursor-pointer flex-col gap-4 rounded-[18px] border border-hairline bg-canvas p-6 outline-none transition-colors hover:border-accent-border"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-[12px] border border-border bg-white">
                      <Icon className="size-5 text-ink" aria-hidden="true" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex size-8 items-center justify-center rounded-pill border border-border bg-white text-secondary transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-accent-fg"
                    >
                      <ArrowUpRight className="size-4" />
                    </span>
                  </span>
                  <span className="mt-auto flex flex-col gap-2">
                    <span className="text-lg font-semibold text-ink">{doc.title}</span>
                    <span className="text-sm text-secondary">{doc.description}</span>
                    <span className="mt-1 text-xs text-faint">Last updated {doc.lastUpdated}</span>
                  </span>
                </Link>
              </motion.div>
              );
            })}
          </div>
        </Section>
      </PageShell>
    </>
  );
}

export default LegalHubPage;
