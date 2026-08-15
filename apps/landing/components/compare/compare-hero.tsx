import { ButtonLink } from "../ui/button-link";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/section";
import { SIGNUP_URL } from "../../consts/site";
import { trackClickedGetStarted } from "../../lib/beacon";

export function CompareHero({
  eyebrow,
  headline,
  story,
}: {
  eyebrow: string;
  headline: string;
  story: string;
}) {
  return (
    <Container className="flex flex-col items-center gap-6 pb-10 pt-20 text-center sm:pb-12 sm:pt-28">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="max-w-3xl text-balance text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[56px]">
        {headline}
      </h1>
      <p className="max-w-xl text-pretty text-lg leading-relaxed text-secondary">{story}</p>
      <div className="flex flex-col items-center gap-3">
        <ButtonLink href={SIGNUP_URL} onClick={() => trackClickedGetStarted("compare-hero")}>
          Create your Kytelink
        </ButtonLink>
        <p className="text-[13px] text-faint">100% free · open source · no card, no trial</p>
      </div>
    </Container>
  );
}
