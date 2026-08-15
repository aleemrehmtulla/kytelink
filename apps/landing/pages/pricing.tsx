import Link from "next/link";
import { NextSeo } from "next-seo";
import { getCdnUrl } from "@kytelink/cdn";
import { PageShell } from "../components/layout/page-shell";
import { Container } from "../components/ui/container";
import { Eyebrow } from "../components/ui/section";
import { FaqJsonLd, type FaqEntry } from "../components/seo/json-ld";
import { SIGNUP_URL, ALEEM_TWITTER_URL, ALEEM_GITHUB_URL } from "../consts/site";
import { trackClickedGetStarted } from "../lib/beacon";
import { buildPageSeo } from "../lib/seo/build-page-seo";

const ALEEM_SITE_URL = "https://aleemrehmtulla.com";

const INCLUDED = [
  "Unlimited links",
  "Custom domains",
  "12 themes",
  "Full analytics",
  "Organizations & roles",
  "Data export",
];

const FAQS: FaqEntry[] = [
  {
    question: "Is Kytelink really 100% free?",
    answer:
      "Yes. Every feature — custom domains, themes, analytics, organizations — is free forever. There is no premium tier, no trial, and no paid plan of any kind.",
  },
  {
    question: "Is Kytelink a good free alternative to Linktree?",
    answer:
      "Yes. Kytelink covers everything most people use Linktree for — a link-in-bio page with themes and analytics — without charging for custom domains or removing branding.",
  },
  {
    question: "How does Kytelink make money?",
    answer:
      "It doesn't, on purpose. Kytelink is a passion project built and hosted by Aleem out of pocket. Just give it a star on github if you like it!",
  },
  {
    question: "Is there a catch — ads or selling my data?",
    answer:
      "No ads, no trackers, no selling data. Analytics are cookie-free and private to you. The code is public on GitHub, so you can verify all of it.",
  },
  {
    question: "Can I use my own domain for free?",
    answer:
      "Yes. Point your domain at Kytelink and your page lives at your own address — a feature most link-in-bio tools charge for.",
  },
  {
    question: "Can I self-host Kytelink?",
    answer:
      "Yes. Kytelink is fully open source. Clone the repo, run one command, and you have your own instance with every feature included.",
  },
  {
    question: "What happens to my data if Kytelink shuts down?",
    answer:
      "You can export your links and settings as JSON at any time, and the open-source code means your page can live on anywhere.",
  },
  {
    question: "How can I support the project?",
    answer:
      "Star it on GitHub, share your Kytelink, or contribute a theme or fix. I always appreciate all the support!",
  },
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      aria-hidden="true"
      className="text-accent flex-shrink-0"
    >
      <path
        d="M3 8.5l3.2 3.2L13 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PricingPage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/pricing",
          title: "Pricing — it's free",
          description:
            "Kytelink is 100% free. Every feature, forever, for everyone. No paid tier, no trials, no catch — it's a fully open-source passion project.",
        })}
      />
      <FaqJsonLd faqs={FAQS} />
      <PageShell>
        <Container className="pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-ink max-w-[720px] text-[40px] leading-[1.05] font-bold tracking-[-0.03em] text-balance sm:text-[56px]">
              The pricing page.
            </h1>
            <p className="text-secondary mt-5 max-w-[440px] text-[17px] leading-relaxed text-pretty">
              This will be quick — everything is free.
              <br />
              Not &quot;free tier&quot; free. Just free.
            </p>
          </div>

          <div className="rounded-menu border-cardline shadow-card-rest mx-auto mt-12 w-full max-w-3xl border bg-white p-7 sm:mt-16 sm:p-8">
            <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex flex-shrink-0 items-baseline gap-1.5">
                <span className="text-ink text-[44px] leading-none font-bold tracking-[-0.03em]">
                  $0
                </span>
                <span className="text-tertiary text-[13px]">/ forever</span>
              </div>
              <ul className="flex flex-1 flex-wrap gap-2">
                {INCLUDED.map((item) => (
                  <li
                    key={item}
                    className="rounded-pill border-cardline text-ink inline-flex items-center gap-1.5 border bg-white px-3 py-1.5 text-[13px]"
                  >
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={SIGNUP_URL}
                onClick={() => trackClickedGetStarted("pricing")}
                className="rounded-pill bg-accent hover:bg-accent-hover inline-flex w-full flex-shrink-0 cursor-pointer items-center justify-center px-7 py-3.5 text-[15px] font-medium text-white transition-colors outline-none sm:w-auto"
              >
                Create yours
              </Link>
            </div>
          </div>

          <div className="rounded-panel border-hairline bg-canvas mx-auto mt-16 w-full max-w-4xl border px-7 py-10 sm:mt-24 sm:px-12 sm:py-12">
            <Eyebrow>Why is it free?</Eyebrow>
            <h2 className="text-ink mt-4 text-[26px] leading-tight font-bold tracking-[-0.025em] text-balance sm:text-[32px]">
              I host it for the love of the game.
            </h2>
            <p className="text-secondary mt-5 max-w-[640px] text-[15px] leading-relaxed">
              hi &lt;:) i&apos;m aleem! i originally built kytelink because linktree
              didn't have @aleem avalaible, and so created this as an overkill solution to
              host my twitter/website in one spot
              <br />
              <br />
              i think monetizing a platform like this is tough, and i've (very gratefully)
              made enough money with my company may.inc that i don't need to worry about
              charging for it.
              <br />
              <br />
              enjoy!
            </p>
            <div className="mt-8 flex items-center gap-4">
              <img
                src={getCdnUrl("brand/aleem.png")}
                alt="Aleem Rehmtulla"
                width={48}
                height={48}
                className="rounded-pill border-border h-12 w-12 border object-cover"
              />
              <div>
                <div className="text-ink text-[14px] font-semibold">Aleem Rehmtulla</div>
                <div className="text-tertiary mt-0.5 flex items-center gap-2 text-[13px]">
                  <a
                    href={ALEEM_SITE_URL}
                    target="_blank"
                    className="text-accent hover:text-accent-hover cursor-pointer transition-colors outline-none"
                  >
                    aleemrehmtulla.com
                  </a>
                  <a
                    href={ALEEM_TWITTER_URL}
                    target="_blank"
                    className="text-accent hover:text-accent-hover flex cursor-pointer items-center transition-colors outline-none"
                    aria-label="Twitter"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M16.63 4.573c-.486.216-1.01.363-1.56.428a2.74 2.74 0 0 0 1.201-1.51 5.476 5.476 0 0 1-1.735.663A2.736 2.736 0 0 0 8.844 7.11c0 .214.023.422.07.622C6.242 7.6 3.985 6.402 2.427 4.561c-.237.403-.374.87-.374 1.37 0 .946.482 1.78 1.214 2.27a2.722 2.722 0 0 1-1.24-.342v.034c0 1.322.94 2.425 2.19 2.679-.228.062-.47.096-.72.096-.177 0-.346-.017-.513-.049.347 1.085 1.355 1.877 2.552 1.898A5.497 5.497 0 0 1 1.5 14.035c-.338 0-.67-.02-1-.057A7.742 7.742 0 0 0 5.372 15.5c6.045 0 9.36-5.025 9.36-9.385 0-.142-.003-.283-.01-.423A6.68 6.68 0 0 0 17 4.86a5.618 5.618 0 0 1-1.57.433c.032-.024.063-.05.094-.082.038-.037.077-.076.116-.115z"
                        fill="currentColor"
                      />
                    </svg>
                  </a>
                  <a
                    href={ALEEM_GITHUB_URL}
                    target="_blank"
                    className="text-accent hover:text-accent-hover flex cursor-pointer items-center transition-colors outline-none"
                    aria-label="GitHub"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M9 1.5c-4.142 0-7.5 3.358-7.5 7.5 0 3.317 2.153 6.125 5.134 7.113.375.07.513-.163.513-.362 0-.179-.006-.773-.01-1.403-2.09.454-2.531-.974-2.531-.974-.341-.869-.834-1.101-.834-1.101-.682-.466.051-.456.051-.456.754.053 1.15.774 1.15.774.671 1.151 1.76.819 2.19.627.068-.486.263-.82.478-1.009-1.669-.19-3.422-.834-3.422-3.713 0-.82.293-1.49.771-2.015-.078-.191-.335-.96.073-2.001 0 0 .63-.202 2.063.77a7.19 7.19 0 0 1 1.88-.252c.638.003 1.282.086 1.88.252 1.433-.972 2.062-.77 2.062-.77.409 1.041.152 1.81.075 2.001.48.525.77 1.195.77 2.015 0 2.886-1.756 3.52-3.43 3.706.27.232.512.69.512 1.392 0 1.006-.009 1.82-.009 2.067 0 .201.136.435.517.36C14.35 15.122 16.5 12.316 16.5 9c0-4.142-3.358-7.5-7.5-7.5z"
                        fill="currentColor"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-16 w-full max-w-4xl sm:mt-24">
            <h2 className="text-ink text-[24px] font-bold tracking-[-0.02em] sm:text-[28px]">
              Frequently asked questions
            </h2>
            <dl className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2">
              {FAQS.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-card border-cardline border bg-white p-5"
                >
                  <dt className="text-ink text-[15px] font-semibold tracking-tight">
                    {faq.question}
                  </dt>
                  <dd className="text-secondary mt-2 text-sm leading-relaxed">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </PageShell>
    </>
  );
}

export default PricingPage;
