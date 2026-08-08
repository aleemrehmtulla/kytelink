import type { ReactNode } from "react";
import { ButtonLink } from "../ui/button-link";
import { Container } from "../ui/container";
import { SIGNUP_URL } from "../../consts/site";
import { trackClickedGetStarted } from "../../lib/beacon";

export function FeatureHero({
  title,
  tagline,
  children,
}: {
  title: string;
  tagline: string;
  children?: ReactNode;
}) {
  return (
    <Container className="flex flex-col items-center gap-7 pb-10 pt-20 text-center sm:pb-12 sm:pt-28">
      <h1 className="max-w-3xl text-balance text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[56px]">
        {title}
      </h1>
      <p className="max-w-xl text-pretty text-lg leading-relaxed text-secondary">{tagline}</p>
      <ButtonLink href={SIGNUP_URL} onClick={() => trackClickedGetStarted("feature-hero")}>
        Create your Kytelink
      </ButtonLink>
      {children}
    </Container>
  );
}
