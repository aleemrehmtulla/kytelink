import Link from "next/link";
import { NextSeo } from "next-seo";
import { PageShell } from "../components/layout/page-shell";
import { Container } from "../components/ui/container";
import { Eyebrow } from "../components/ui/section";
import {
  CONTACT_CHANNELS,
  CONTACT_HEADLINE,
  CONTACT_INTRO,
  type ContactChannel,
} from "../consts/company";
import { SUPPORT_EMAIL } from "../lib/legal/contact";
import { buildPageSeo } from "../lib/seo/build-page-seo";

function ChannelLink({ channel }: { channel: ContactChannel }) {
  const className =
    "text-accent hover:text-accent-hover mt-3 inline-block cursor-pointer text-[14px] font-medium transition-colors outline-none";
  if (channel.href.startsWith("/")) {
    return (
      <Link href={channel.href} className={className}>
        {channel.linkLabel}
      </Link>
    );
  }
  return (
    <a
      href={channel.href}
      className={className}
      {...(channel.href.startsWith("http")
        ? { target: "_blank", rel: "noreferrer" }
        : {})}
    >
      {channel.linkLabel}
    </a>
  );
}

export function ContactPage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/contact",
          title: "Contact Kytelink",
          description: `How to reach Kytelink: email ${SUPPORT_EMAIL} for support, report abuse, appeal a suspension, or open an issue on GitHub.`,
        })}
      />
      <PageShell>
        <Container className="pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Contact</Eyebrow>
            <h1 className="text-ink mt-4 text-[36px] leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-[48px]">
              {CONTACT_HEADLINE}
            </h1>
            <p className="text-secondary mt-5 max-w-[560px] text-[16px] leading-relaxed">
              {CONTACT_INTRO}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {CONTACT_CHANNELS.map((channel) => (
                <div
                  key={channel.title}
                  className="rounded-card border-cardline border bg-white p-5"
                >
                  <div className="text-ink text-[15px] font-semibold tracking-tight">
                    {channel.title}
                  </div>
                  <p className="text-secondary mt-2 text-sm leading-relaxed">
                    {channel.description}
                  </p>
                  <ChannelLink channel={channel} />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </PageShell>
    </>
  );
}

export default ContactPage;
