import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "../ui/container";

interface UseCaseCard {
  icon: string;
  title: string;
  body: string;
  href?: string;
}

const CARDS: UseCaseCard[] = [
  { icon: "🎥", title: "Creators", body: "Every platform, one link under your videos.", href: "/use-cases/creators" },
  { icon: "⌨️", title: "Developers", body: "Projects, GitHub, blog — a README for you." },
  { icon: "🎸", title: "Musicians", body: "Streams, tickets, and merch in one place.", href: "/use-cases/musicians" },
  { icon: "🏡", title: "Small teams", body: "A shared page the whole org can edit." },
];

const CARD_CLASS =
  "flex h-full flex-col rounded-[18px] border border-hairline bg-canvas px-[22px] py-6";

function CardBody({ card }: { card: UseCaseCard }) {
  return (
    <>
      <div className="text-xl" aria-hidden="true">
        {card.icon}
      </div>
      <div className="mt-3.5 text-[15px] font-semibold text-ink">{card.title}</div>
      <div className="mt-1.5 text-[13px] leading-normal text-secondary">{card.body}</div>
    </>
  );
}

function CardWrapper({ card, children }: { card: UseCaseCard; children: ReactNode }) {
  if (card.href) {
    return (
      <Link
        href={card.href}
        className={`${CARD_CLASS} cursor-pointer outline-none transition-colors hover:border-accent-border`}
      >
        {children}
      </Link>
    );
  }
  return <div className={CARD_CLASS}>{children}</div>;
}

export function UseCaseGrid() {
  return (
    <Container className="flex flex-col items-center py-16 sm:py-24">
      <h2 className="text-center text-[28px] font-bold tracking-[-0.025em] text-ink sm:text-4xl">
        Made for whatever you make.
      </h2>
      <div className="mt-10 grid w-full max-w-[960px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <CardWrapper key={card.title} card={card}>
            <CardBody card={card} />
          </CardWrapper>
        ))}
      </div>
    </Container>
  );
}
