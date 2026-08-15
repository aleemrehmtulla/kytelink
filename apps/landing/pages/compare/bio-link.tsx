import { ComparePageLayout } from "../../components/compare/compare-page-layout";
import { getCompetitor } from "../../consts/competitors";

const competitor = getCompetitor("bio-link");

const sections = [
  {
    heading: "What Bio Link does well",
    paragraphs: [
      "Bio Link comes from the Buy Me a Coffee team, and it shows. Pages load fast, the themes are tasteful, and more than three million creators use it. If you want a link page from a company that has been looking after creators for years, it's an easy recommendation.",
      "Pro's headline feature is the AI assistant — trained on your own content, so it can answer visitors' questions for you. Kytelink has nothing like it. If that's the feature you came for, Bio Link is the one to pick.",
    ],
  },
  {
    heading: "Which side of the plan the basics sit on",
    paragraphs: [
      "Bio Link has one paid plan, Pro, at $7.49 a month billed yearly, with a seven-day trial. A custom domain sits on it, and so does removing the small Bio Link badge from your page. Those are the two things most people want first. On Kytelink both are free — connect a domain, toggle the badge off, done.",
      "The rest follows the same shape. Per-link analytics, scheduled publishing, and organizations with roles are all free here, because there's no plan for them to sit behind. That's not a criticism of Bio Link — a subscription is a fair way to fund a product, and theirs pays for real work. Kytelink just doesn't have a tier to protect.",
    ],
  },
  {
    heading: "Two different promises",
    paragraphs: [
      "Kytelink's source code is public and MIT-licensed. You can read exactly how clicks are counted, export your page as JSON whenever you want, or run the entire platform on your own server with every feature intact.",
      "Bio Link is closed source, with no self-hosting — which is normal, and it comes with a real company and real support behind it. The two are simply promising different things. Bio Link's promise is that they'll keep running it well. Kytelink's is that you never have to depend on us at all.",
    ],
  },
  {
    heading: "What Kytelink doesn't do",
    paragraphs: [
      "No AI assistant, no email list, no posts to subscribers, no checkout. Bio Link's Pro plan bundles the first three, and if your page is doing that job, paying for it is money well spent. Kytelink is deliberately narrower: a fast link page, real analytics, and full ownership.",
      "If you already run email somewhere else, Kytelink links out to it like any other link, and your list stays on a tool built for it.",
    ],
  },
  {
    heading: "Moving over from Bio Link",
    paragraphs: [
      "Rebuilding a bio.link page is a copy-paste session: your links, your bio and avatar, one of 12 themes, then the font and accent color to match. If you were on Pro, connect the same domain to Kytelink — it's included — and update your social bios last. Your old page keeps working while you switch, so there's no downtime and no importer to wait on.",
      "One naming note, since the two get mixed up: Bio Link (bio.link) is not Squarespace's Bio Sites. That's a different product, with its own comparison here.",
    ],
  },
];

const faqs = [
  {
    question: "Is Kytelink cheaper than Bio Link?",
    answer:
      "Yes — Kytelink is $0 with every feature included. Bio Link's Pro plan is $7.49/mo billed yearly (roughly double month-to-month), and it's where custom domains and branding removal live.",
  },
  {
    question: "Does Bio Link put its branding on free pages?",
    answer:
      "Free bio.link pages carry a small Bio Link badge, and removing it is part of the Pro plan. On Kytelink, hiding the badge is a free toggle in the editor.",
  },
  {
    question: "Can I use my own domain on Bio Link?",
    answer:
      "Yes, on the Pro plan. Kytelink includes custom domains free, with certificates issued automatically.",
  },
  {
    question: "Does Kytelink have an AI assistant like Bio Link?",
    answer:
      "No. Bio Link's AI chat answers visitor questions from your own content, and it's a genuinely good feature — Kytelink is a straightforward link page with analytics, not an AI product.",
  },
  {
    question: "Is Bio Link open source?",
    answer:
      "No. Bio Link is a closed, well-supported product from the Buy Me a Coffee team. Kytelink's code is public on GitHub under MIT and can be self-hosted with every feature.",
  },
  {
    question: "Is Bio Link the same thing as Bio Sites?",
    answer:
      "No — Bio Link is bio.link, from the Buy Me a Coffee team. Bio Sites is Squarespace's free link page. They're separate products, each with its own comparison here.",
  },
];

export function BioLinkComparePage() {
  return (
    <ComparePageLayout
      competitor={competitor}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="No Pro plan to reach — the domain and the badge toggle are already yours."
    />
  );
}

export default BioLinkComparePage;
