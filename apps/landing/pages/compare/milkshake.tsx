import { ComparePageLayout } from "../../components/compare/compare-page-layout";
import { getCompetitor } from "../../consts/competitors";

const competitor = getCompetitor("milkshake");

const sections = [
  {
    heading: "Phone-first, by design",
    paragraphs: [
      "Milkshake's swipeable, story-style cards are genuinely charming, and building everything from a phone app is a deliberate choice that suits many creators. It does mean there's no web editor: no full keyboard for writing copy, and no easy way for a manager or assistant to help from a laptop.",
      "Kytelink covers both worlds: a full editor in any browser, with a live phone preview beside it. Edit from your laptop, your tablet, or yes, your phone — and invite teammates with roles when you don't want to do it alone.",
    ],
  },
  {
    heading: "How the tiers add up",
    paragraphs: [
      "Milkshake's free plan shows its branding and offers a 30-day analytics window. Removing the logo costs $2.99 a month, custom domains sit in the top tier, and sales carry a 7–12% fee depending on plan.",
      "Kytelink bundles the lot: watermark off with one click, your own domain connected free, a 90-day analytics view, and no fees anywhere. It's free because it's open source, with no pricing ladder behind it.",
    ],
  },
  {
    heading: "Swipeable cards, or a page you own",
    paragraphs: [
      "If the Instagram-story aesthetic is exactly what you want and you live on your phone, Milkshake does that one thing well — sincerely. The trade is that the page lives inside the app, at a msha.ke URL on lower tiers, without a way to take the page itself elsewhere later.",
      "A Kytelink page is a real website you own: open-source platform, JSON export of your page, self-hosting if you want it, and 12 themes with custom fonts and accents to make it yours.",
    ],
  },
  {
    heading: "From phone app to any browser",
    paragraphs: [
      "Switching is a one-sitting job: open your Milkshake in the app, your Kytelink editor on the machine of your choice, and rebuild each card as a link — most Milkshake sites are a handful of cards, so this takes minutes. Add your socials, pick a theme, done.",
      "Then update your Instagram bio to the new URL — your own domain if you have one, connected free. From that point on, edits happen wherever you are: laptop at work, phone on the go, or a teammate's browser with their own role-scoped login.",
    ],
  },
];

const faqs = [
  {
    question: "Can I edit Milkshake from a computer?",
    answer:
      "No — Milkshake is editable only from its phone app, by design. Kytelink has a full web editor that works in any browser, on any device.",
  },
  {
    question: "Is Kytelink a free alternative to Milkshake?",
    answer:
      "Yes. Branding removal, custom domains, full analytics, scheduling, and teams are all free on Kytelink — features Milkshake spreads across paid tiers.",
  },
  {
    question: "Does Milkshake take a cut of sales?",
    answer:
      "Yes — 12% on free and Lite, 9% on Pro, 7% on Pro+, plus payment processing. Kytelink takes nothing; it links out to whatever store you already use.",
  },
  {
    question: "Is Milkshake open source?",
    answer:
      "No — Milkshake's code isn't public. Kytelink's code is on GitHub under the MIT license, and the whole platform can be self-hosted.",
  },
  {
    question: "Can a team manage a Kytelink page?",
    answer:
      "Yes — organizations with roles are free, so a manager or assistant can edit without sharing your login. Milkshake has no multi-user support.",
  },
  {
    question: "Can I keep a story-style look on Kytelink?",
    answer:
      "Not exactly — Kytelink pages are a clean column of links rather than swipeable cards, but 12 themes plus custom fonts and accent colors give you real range to match your brand.",
  },
];

export function MilkshakeComparePage() {
  return (
    <ComparePageLayout
      competitor={competitor}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="A real web editor. A page you own."
    />
  );
}

export default MilkshakeComparePage;
