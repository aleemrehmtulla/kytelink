import type { GetStaticProps } from "next";
import { FeaturePageLayout } from "../../components/features-pages/feature-page-layout";
import { CapabilityGridMock } from "../../components/features-pages/open-source/capability-grid-mock";
import { ComposeSnippetMock } from "../../components/features-pages/open-source/compose-snippet-mock";
import { GithubStatsMock } from "../../components/features-pages/open-source/github-stats-mock";
import { getFeature } from "../../consts/features";
import { fetchGithubStars } from "../../lib/github-stars";

const feature = getFeature("open-source");

const bullets = [
  {
    title: "No mandatory SaaS",
    description: "R2, Resend, ClickHouse Cloud, Neon, OpenAI, Vercel — every one has a self-hostable swap-in.",
  },
  {
    title: "Runs without ClickHouse or S3",
    description: "Analytics and uploads switch off cleanly if you skip them. Nothing breaks.",
  },
  {
    title: "Real code, not a demo",
    description: "The exact code behind kytelink.com — no gated \"enterprise\" fork.",
  },
];

const sections = [
  {
    heading: "Open source, without the asterisk",
    paragraphs: [
      "Kytelink's entire codebase is public on GitHub — the same code that runs kytelink.com, not a stripped-down community edition with the good parts held back. Read it, fork it, fix it, or run it yourself.",
      "Free and open source isn't a growth tactic here; it's the point. Your page, your data, and the software it runs on all stay in your reach.",
    ],
  },
  {
    heading: "Self-host in three commands",
    paragraphs: [
      "Clone the repo, run the setup wizard, and start the app. The wizard asks which optional services you want — Postgres is the only must — then writes your config, starts Docker, migrates the database, and seeds sample data. The self-hosting guide walks through production deployment step by step.",
      "Every third-party service Kytelink can use has a self-hostable swap-in, so a full deployment never requires signing up for anyone's cloud.",
    ],
  },
  {
    heading: "Optional services, graceful fallbacks",
    paragraphs: [
      "Skip ClickHouse and analytics quietly turn off. Skip S3 and avatars fall back to generated initials. Skip the email provider and OTPs print to the server console. Every optional capability degrades to a calm fallback instead of a crash — so a minimal install is genuinely minimal.",
    ],
  },
];

const faqs = [
  {
    question: "Is Kytelink really free?",
    answer:
      "Yes. The hosted version is free with every feature included, and the source code is public so you can verify there's no catch waiting.",
  },
  {
    question: "Can I self-host Kytelink?",
    answer:
      "Yes. Clone the repository, run the interactive setup wizard, and the full product runs on your own server in minutes — three commands end to end.",
  },
  {
    question: "What do I need to run it?",
    answer:
      "Docker and a server. Postgres and Redis come up via docker compose; everything else — analytics, uploads, email — is optional and switches off gracefully if you skip it.",
  },
  {
    question: "Is the hosted version the same code?",
    answer:
      "Yes. kytelink.com runs the exact code in the public repository — there is no gated enterprise fork.",
  },
  {
    question: "Can I export my data and leave?",
    answer:
      "Anytime. Your links and settings export as JSON, and since the software is open source, you can take them to your own deployment.",
  },
  {
    question: "Can I contribute or report a bug?",
    answer:
      "Yes. The repository is public on GitHub — open an issue, send a pull request, or fork it and take the project in your own direction.",
  },
];

interface OpenSourceFeaturePageProps {
  stars: number;
}

export function OpenSourceFeaturePage({ stars }: OpenSourceFeaturePageProps) {
  return (
    <FeaturePageLayout
      feature={feature}
      bullets={bullets}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Or use the hosted version — also free."
      mockups={
        <>
          <CapabilityGridMock />
          <ComposeSnippetMock />
          <GithubStatsMock stars={stars} />
        </>
      }
    />
  );
}

export default OpenSourceFeaturePage;

export const getStaticProps: GetStaticProps<OpenSourceFeaturePageProps> = async () => {
  const stars = await fetchGithubStars();
  return { props: { stars }, revalidate: 3600 };
};
