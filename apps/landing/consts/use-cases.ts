export type UseCaseSlug = "creators" | "musicians" | "agencies";

export interface UseCaseMeta {
  slug: UseCaseSlug;
  title: string;
  headline: string;
  story: string;
  seoTitle: string;
  seoDescription: string;
}

export const USE_CASES: readonly UseCaseMeta[] = [
  {
    slug: "creators",
    title: "Creators",
    headline: "Claim your handle. Live in 60 seconds.",
    story:
      "One page for every video, drop, and store. Sign up, pick a theme, add your links — your kyte is live before your coffee's done.",
    seoTitle: "Link-in-bio for creators",
    seoDescription: "A link-in-bio built for creators: claim your handle and go live in 60 seconds.",
  },
  {
    slug: "musicians",
    title: "Musicians",
    headline: "Schedule the single for the 1st. The album for the 5th.",
    story:
      "Queue up releases ahead of time. Your page updates itself the moment the clock hits midnight — no waking up to hit publish.",
    seoTitle: "Link-in-bio for musicians",
    seoDescription: "Schedule releases ahead of time — your Kytelink page updates itself the moment it's time.",
  },
  {
    slug: "agencies",
    title: "Agencies",
    headline: "Fifteen client pages. One login. Granular roles.",
    story:
      "Run every client's kyte from a single organization. Give editors just enough access, and keep billing and domains under your control.",
    seoTitle: "Link-in-bio for agencies",
    seoDescription: "Manage every client's link-in-bio from one organization login, with granular team roles.",
  },
] as const;

export function getUseCase(slug: UseCaseSlug): UseCaseMeta {
  const useCase = USE_CASES.find((item) => item.slug === slug);
  if (!useCase) throw new Error(`Unknown use-case slug: ${slug}`);
  return useCase;
}
