import { ComparePageLayout } from "../../components/compare/compare-page-layout";
import { getCompetitor } from "../../consts/competitors";

const competitor = getCompetitor("linkstack");

const sections = [
  {
    heading: "First: LinkStack is the real thing",
    paragraphs: [
      "This page compares two open-source projects, so let's start fair. LinkStack is a genuine, actively maintained Linktree alternative — a PHP/Laravel app with a proper admin panel, drag-and-drop links, community themes, built-in click and visitor analytics, and an installer designed to work on cheap shared hosting without touching a terminal.",
      "If your ideal setup is a PHP app on the hosting you already pay for, LinkStack is a fine choice, and its hosted plans mean you can even use it without running a server yourself.",
    ],
  },
  {
    heading: "Where Kytelink differs",
    paragraphs: [
      "The biggest practical difference is the hosted version. Kytelink's is free with every feature — custom domains included — because it's Aleem's passion project, hosted out of pocket. LinkStack's official hosted plans are paid, with custom domains from the $5-a-month tier.",
      "Kytelink also ships two things LinkStack doesn't advertise. Scheduled publishing queues a page change for release day. And organizations with roles let a team manage one page together — LinkStack's multi-user support gives each account its own page instead. If you're searching for a LinkStack alternative for either of those reasons, that's the short version of the pitch.",
    ],
  },
  {
    heading: "Different stacks, different licenses",
    paragraphs: [
      "LinkStack is PHP/Laravel with SQLite or MySQL, installed from a zip or its Docker image, and licensed AGPL-3.0. Kytelink is TypeScript end to end — Next.js, Fastify, Postgres — runs with one docker compose command, and is MIT-licensed, which matters if you ever want to embed or modify it commercially.",
      "Both projects are honest answers to the same question. Pick LinkStack if PHP hosting is your comfort zone; pick Kytelink if you want the free hosted page today and a modern TypeScript stack when you decide to self-host.",
    ],
  },
];

const faqs = [
  {
    question: "Are both Kytelink and LinkStack open source?",
    answer:
      "Yes. LinkStack is AGPL-3.0 and Kytelink is MIT — both fully self-hostable with public source code on GitHub.",
  },
  {
    question: "Does LinkStack have a hosted version?",
    answer:
      "Yes — official paid hosted plans, with custom domains from the $5/month tier (as of August 2026). Kytelink's hosted version is free with every feature, custom domains included.",
  },
  {
    question: "Does LinkStack have analytics?",
    answer:
      "Yes — LinkStack has built-in link click and visitor analytics. Kytelink's analytics are also free: views, clicks, referrers, devices, and countries.",
  },
  {
    question: "Can a team manage one page on LinkStack?",
    answer:
      "Not on one page — LinkStack's multi-user support gives each account its own page on a shared instance. Kytelink organizations let several people manage the same page with roles.",
  },
  {
    question: "Which is easier to self-host?",
    answer:
      "LinkStack is easier on classic shared PHP hosting — that's its specialty. Kytelink is easier with Docker: one compose command brings up the whole TypeScript/Postgres stack.",
  },
  {
    question: "Is Kytelink a good LinkStack alternative?",
    answer:
      "If you want LinkStack's openness plus a free hosted version, scheduled publishing, and team roles, yes — Kytelink is a natural LinkStack alternative. Neither project takes fees, shows ads, or sells data.",
  },
];

export function LinkstackComparePage() {
  return (
    <ComparePageLayout
      competitor={competitor}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Open source, with a free hosted home."
    />
  );
}

export default LinkstackComparePage;
