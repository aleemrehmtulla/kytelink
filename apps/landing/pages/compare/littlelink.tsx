import { ComparePageLayout } from "../../components/compare/compare-page-layout";
import { getCompetitor } from "../../consts/competitors";

const competitor = getCompetitor("littlelink");

const sections = [
  {
    heading: "LittleLink is a template, on purpose",
    paragraphs: [
      "LittleLink is one of the nicest ideas in open source: a pure HTML/CSS page — no JavaScript, no build step, no database — with 100+ branded buttons, MIT-licensed, deployable free on GitHub Pages, Netlify, Vercel, or anywhere static files live. There's nothing to run, patch, or pay for, ever.",
      "The trade is that everything is manual. Changing a link means editing index.html and redeploying. There's no editor, no analytics, no accounts — by design. (Its cousin LittleLink-Server wraps the same idea in a Docker container configured by environment variables — still no UI.)",
    ],
  },
  {
    heading: "Kytelink is the product version of the same values",
    paragraphs: [
      "Kytelink keeps the parts that make LittleLink great — open source, MIT, self-hostable, genuinely free — and adds the product layer: a web editor with live preview, per-link analytics, scheduled publishing, 12 themes, and organizations with roles.",
      "It also removes the deploy step entirely if you want it to: the hosted version at kytelink.com is free with every feature, so your page is live in a minute and editable from any browser — no git push to change a link.",
    ],
  },
  {
    heading: "Which one should you use?",
    paragraphs: [
      "If you're a developer who enjoys owning every byte, wants a page that scores 100s on PageSpeed, and doesn't care about click counts — use LittleLink, sincerely. It's excellent at being exactly that.",
      "If you want to know which links get clicked, schedule your page for release day, hand editing to a teammate, or just skip the redeploy loop — you're looking for a LittleLink alternative, and that's the job Kytelink was built for, at the same price of zero.",
    ],
  },
];

const faqs = [
  {
    question: "Are both Kytelink and LittleLink free and open source?",
    answer:
      "Yes — both are MIT-licensed and free. LittleLink is a static template you host anywhere; Kytelink is a full platform with a free hosted version and self-hosting.",
  },
  {
    question: "Does LittleLink have an editor or analytics?",
    answer:
      "No, deliberately — you edit the HTML and redeploy, and it recommends third-party analytics. Kytelink has a full web editor and built-in, privacy-clean analytics.",
  },
  {
    question: "What about LittleLink-Server?",
    answer:
      "It's LittleLink repackaged as a Docker/Node app configured entirely by environment variables — great for homelabs, but still a single profile with no UI or analytics.",
  },
  {
    question: "Can I schedule changes to a LittleLink page?",
    answer:
      "Only by deploying at the right moment yourself. Kytelink schedules a queued set of changes to publish automatically at a date and time you pick.",
  },
  {
    question: "Which is faster?",
    answer:
      "A static LittleLink page is about as fast as a web page can be. Kytelink pages are also built to be very fast — but if raw PageSpeed perfection is the goal, static files win.",
  },
  {
    question: "What's a good LittleLink alternative with an editor and analytics?",
    answer:
      "Kytelink — it keeps LittleLink's MIT, self-hostable, open-source foundation but adds a web editor, per-link analytics, scheduling, teams, and a free hosted option.",
  },
];

export function LittlelinkComparePage() {
  return (
    <ComparePageLayout
      competitor={competitor}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Template simplicity, product powers."
    />
  );
}

export default LittlelinkComparePage;
