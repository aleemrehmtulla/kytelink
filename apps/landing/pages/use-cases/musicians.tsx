import { UseCasePageLayout } from "../../components/use-cases/use-case-page-layout";
import { getUseCase } from "../../consts/use-cases";

const useCase = getUseCase("musicians");

const sections = [
  {
    heading: "Release day runs itself",
    paragraphs: [
      "Queue the page ahead of the drop: swap the pre-save link for the streaming link, move the new single to the top, update the bio. Schedule it for midnight and Kytelink publishes the whole change at once — while you're asleep, on stage, or celebrating.",
      "The scheduled snapshot sits next to your live page in the editor, so you can check exactly what fans will see before it happens.",
    ],
  },
  {
    heading: "Streams, tickets, and merch in one place",
    paragraphs: [
      "Your bio link has a lot of jobs: Spotify and Apple Music, the tour ticket page, the vinyl pre-order, the mailing list. Kytelink holds all of them on one fast page, with your artwork and a theme that matches the record.",
      "Analytics show which cities click tour dates and which platforms drive streams — real numbers for routing the next tour and timing the next single.",
    ],
  },
  {
    heading: "Your audience, not the algorithm's",
    paragraphs: [
      "Platforms come and go, and reach gets rented back to you one boosted post at a time. A link-in-bio page you own — ideally on your own domain, which Kytelink includes free — plus a mailing-list link is the simplest way to keep a direct line to the people who actually show up.",
    ],
  },
];

const faqs = [
  {
    question: "Can I schedule my page to change on release day?",
    answer:
      "Yes. Queue any set of changes — new links, new order, new theme — and pick the exact date and time. It publishes automatically, timezone-aware.",
  },
  {
    question: "Can I put streaming, tickets, and merch on one page?",
    answer:
      "Yes. Add as many links as you need: Spotify, Apple Music, Bandcamp, ticket pages, merch stores, and your mailing list, all on one page.",
  },
  {
    question: "Does Kytelink work for bands with multiple members managing it?",
    answer:
      "Yes. Create an organization and invite bandmates or your manager with roles — an editor can prep the page while only a manager can hit publish.",
  },
  {
    question: "Can I see where fans are clicking from?",
    answer:
      "Yes. Free analytics break down clicks by link, referrer, device, and country — handy for tour routing and knowing which platform is pulling.",
  },
  {
    question: "Is any of this behind a paid plan?",
    answer:
      "No. Scheduling, analytics, themes, and custom domains are all free. Kytelink is open source and stays that way.",
  },
  {
    question: "Will my page match my cover art?",
    answer:
      "Yes. Pick from twelve themes and layer on a font and an accent color pulled from the record, so the page reads like part of the release instead of a generic list of links.",
  },
];

export function MusiciansUseCasePage() {
  return (
    <UseCasePageLayout
      useCase={useCase}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Schedule the drop. Sleep in."
    />
  );
}

export default MusiciansUseCasePage;
