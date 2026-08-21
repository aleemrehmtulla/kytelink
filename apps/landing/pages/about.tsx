import Link from "next/link";
import { NextSeo } from "next-seo";
import { getCdnUrl } from "@kytelink/cdn";
import { PageShell } from "../components/layout/page-shell";
import { Container } from "../components/ui/container";
import { Eyebrow } from "../components/ui/section";
import {
  GITHUB_REPO_URL,
  ALEEM_TWITTER_URL,
  ALEEM_GITHUB_URL,
  ALEEM_SITE_URL,
  SIGNUP_URL,
} from "../consts/site";
import { ABOUT_HEADLINE, ABOUT_PARAGRAPHS } from "../consts/company";
import { buildPageSeo } from "../lib/seo/build-page-seo";

export function AboutPage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/about",
          title: "About Kytelink",
          description:
            "Why Kytelink exists, who builds it, and why every feature is free: an open-source link-in-bio run as a passion project, not a business.",
        })}
      />
      <PageShell>
        <Container className="pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>About</Eyebrow>
            <h1 className="text-ink mt-4 text-[36px] leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-[48px]">
              {ABOUT_HEADLINE}
            </h1>
            <div className="mt-8 space-y-5">
              {ABOUT_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph} className="text-secondary text-[15px] leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="rounded-panel border-hairline bg-canvas mt-12 border px-7 py-8 sm:px-9">
              <div className="flex items-center gap-4">
                <img
                  src={getCdnUrl("brand/aleem.png")}
                  alt="Aleem Rehmtulla"
                  width={48}
                  height={48}
                  className="rounded-pill border-border h-12 w-12 border object-cover"
                />
                <div>
                  <div className="text-ink text-[14px] font-semibold">
                    Aleem Rehmtulla
                  </div>
                  <div className="text-tertiary mt-0.5 flex items-center gap-2 text-[13px]">
                    <a
                      href={ALEEM_SITE_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:text-accent-hover cursor-pointer transition-colors outline-none"
                    >
                      aleemrehmtulla.com
                    </a>
                    <a
                      href={ALEEM_TWITTER_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:text-accent-hover cursor-pointer transition-colors outline-none"
                    >
                      Twitter
                    </a>
                    <a
                      href={ALEEM_GITHUB_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:text-accent-hover cursor-pointer transition-colors outline-none"
                    >
                      GitHub
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href={SIGNUP_URL}
                className="rounded-pill bg-accent hover:bg-accent-hover inline-flex cursor-pointer items-center px-6 py-3 text-[15px] font-medium text-white transition-colors outline-none"
              >
                Create your kyte
              </Link>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-accent-hover cursor-pointer text-[15px] font-medium transition-colors outline-none"
              >
                Read the source
              </a>
              <Link
                href="/contact"
                className="text-accent hover:text-accent-hover cursor-pointer text-[15px] font-medium transition-colors outline-none"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </Container>
      </PageShell>
    </>
  );
}

export default AboutPage;
