import { ComparePageLayout } from "../../components/compare/compare-page-layout";
import { getCompetitor } from "../../consts/competitors";

const competitor = getCompetitor("carrd");

const sections = [
  {
    heading: "Two indie projects, one honest difference",
    paragraphs: [
      "Carrd is what indie software should look like: one founder, fair prices, millions of lovingly-made one-page sites. Kytelink shares that spirit — it's also built by one person (hi, that's Aleem), free and open source — so this comparison is less “gotcha” and more “which tool fits the job.”",
      "The difference is the job. Carrd is a general one-page site builder you can bend into a link-in-bio. Kytelink is a link-in-bio, purpose-built: per-link click analytics, scheduled publishing, themes tuned for a column of links, and organizations with roles, all out of the box.",
    ],
  },
  {
    heading: "The features a link page actually needs",
    paragraphs: [
      "On Carrd, a custom domain needs the $19-a-year tier, forms need it too, and click analytics never arrive natively at any tier — you wire up Google Analytics yourself and still don't get per-link counts. Downloading your site's code requires the $49-a-year plan.",
      "Kytelink includes the domain, the analytics, and the export for free. And because the whole platform is open source, “download your site” isn't a feature tier — it's the GitHub repo.",
    ],
  },
  {
    heading: "When Carrd is the right answer",
    paragraphs: [
      "If you're designing a freeform landing page — a waitlist, a portfolio, a fan page with custom layout — Carrd's element-by-element editor is genuinely better at that, and $19 a year is a bargain for it.",
      "If what you need is the link in your bio — live in a minute, measurable, schedulable, on your own domain, with no annual invoice — that's the thing Kytelink was built to be.",
    ],
  },
  {
    heading: "Moving your bio link off Carrd",
    paragraphs: [
      "You don't have to pick a side. Plenty of people keep Carrd for the portfolio or commission sheet and move the bio link itself to Kytelink — where it gets click analytics and scheduling — with the Carrd site as one of the links.",
      "The move is manual and quick: recreate your links, match the look with a theme, font, and accent color, and connect a domain if you have one (free here, $19 a year there). Your Carrd stays live throughout, so nothing breaks mid-switch.",
    ],
  },
];

const faqs = [
  {
    question: "Is Kytelink a free alternative to Carrd for link-in-bio pages?",
    answer:
      "Yes. For the link-in-bio job specifically, Kytelink includes free custom domains, native per-link analytics, scheduling, and themes — no paid tier involved.",
  },
  {
    question: "Does Carrd have click analytics?",
    answer:
      "Not natively. Carrd's paid tiers let you connect Google Analytics, but there's no built-in per-link click tracking. Kytelink counts views and clicks per link, free.",
  },
  {
    question: "Is Carrd open source?",
    answer:
      "No. Carrd is a closed platform run by a solo founder. Kytelink's full source is public on GitHub, and you can self-host it with every feature.",
  },
  {
    question: "Can I use my own domain on Kytelink?",
    answer:
      "Yes — free. On Carrd, custom domains start at the Pro Standard tier ($19/year as of August 2026, billed annually only).",
  },
  {
    question: "Can I export my page from Kytelink or Carrd?",
    answer:
      "Kytelink exports your links and settings as JSON, free. Carrd offers a site download on its Pro Plus plan ($49/year as of August 2026).",
  },
  {
    question: "What is Carrd better at?",
    answer:
      "Freeform one-page design. Portfolios, waitlists, and custom landing pages are Carrd's home turf — Kytelink focuses entirely on the link-in-bio page.",
  },
];

export function CarrdComparePage() {
  return (
    <ComparePageLayout
      competitor={competitor}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Purpose-built for your bio link. Free and open."
    />
  );
}

export default CarrdComparePage;
