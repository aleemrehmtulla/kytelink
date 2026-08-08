import Link from "next/link";
import { Section } from "./section";
import { SIGNUP_URL } from "../../consts/site";
import { trackClickedGetStarted } from "../../lib/beacon";

export function CtaBand({
  title,
  subtitle,
  ctaLabel = "Create your Kytelink",
  href = SIGNUP_URL,
}: {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  href?: string;
}) {
  return (
    <Section className="border-t border-hairline text-center">
      <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-secondary">{subtitle}</p>
      <div className="mt-8 flex justify-center">
        <Link
          href={href}
          onClick={() => trackClickedGetStarted("cta-band")}
          className="inline-flex cursor-pointer items-center justify-center rounded-pill bg-accent px-8 py-4 text-base font-medium text-white shadow-cta outline-none transition-colors duration-150 hover:bg-accent-hover"
        >
          {ctaLabel}
        </Link>
      </div>
    </Section>
  );
}
