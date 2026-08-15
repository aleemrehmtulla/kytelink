import { ComparePageLayout } from "../../components/compare/compare-page-layout";
import { getCompetitor } from "../../consts/competitors";

const competitor = getCompetitor("linktree");

const sections = [
  {
    heading: "How the two pricing models differ",
    paragraphs: [
      "Linktree's free plan includes its logo, basic analytics, and a 12% fee on digital sales made through it. Hiding the branding comes with the Pro plan ($17 a month, or $13.50 billed annually), and a custom domain isn't currently offered on any plan. Prices rose as much as 67% in November 2025 and were adjusted again in 2026.",
      "Kytelink has one plan: everything, for $0, forever. Custom domains, full analytics, scheduling, teams, and a one-click switch to drop the watermark. It stays free because it's an open-source passion project built and hosted by Aleem, with no paid tier to protect.",
    ],
  },
  {
    heading: "Why owning your link matters",
    paragraphs: [
      "A linktr.ee URL is shared with 70 million other accounts, so when Instagram throttles the domain over spam elsewhere, clean pages can get caught too. And if an automated moderation sweep flags an account, the one link printed on everything goes dark until it's resolved. A custom domain is the usual fix — it's just not something Linktree currently offers.",
      "Kytelink gives every page a free custom domain, so your link's reputation is yours alone. And if you ever want to leave, export your links and settings as JSON — or take the code and run the whole thing on your own server.",
    ],
  },
  {
    heading: "Where Linktree is genuinely ahead",
    paragraphs: [
      "Honesty matters in a comparison: Linktree has a built-in checkout for selling products, a marketplace of sponsored-link deals, and integrations a small open-source project doesn't. If you want commerce handled inside your bio link and don't mind the fees, it's a polished product.",
      "Kytelink's bet is that most people want a fast, beautiful page that lists their links, shows them real analytics, and never sends a bill. If that's the job, the $160 to $205 a year Pro costs (as of August 2026) is money you can happily keep.",
    ],
  },
  {
    heading: "How to switch from Linktree",
    paragraphs: [
      "There's no import wizard because none is needed: open your Linktree in one tab, your Kytelink editor in the other, and re-add your links — most bio pages carry a dozen or two, so this is a ten-minute job. Pick a theme, set your accent color, and flip the watermark toggle if you want it gone.",
      "Then point your own domain at the page (a few DNS records, free) or use kytelink.com/yourname, and update the link in your Instagram, TikTok, and YouTube bios. Your Linktree keeps working while you switch, so there's no downtime at any point in the move.",
    ],
  },
];

const faqs = [
  {
    question: "Is Kytelink a free alternative to Linktree?",
    answer:
      "Yes — and not free-tier free. Custom domains, analytics, scheduling, themes, and teams are all included at $0, with no paid plan to upgrade into.",
  },
  {
    question: "How do I switch from Linktree to Kytelink?",
    answer:
      "Create your page, add your links, and swap the URL in your social bios. Most pages take under ten minutes to rebuild, and your Kytelink can live on your own domain from day one.",
  },
  {
    question: "Does Kytelink put a watermark on my page?",
    answer:
      "There's a small “made with kytelink” watermark by default, and a one-click toggle in settings removes it — free, not behind a paid plan.",
  },
  {
    question: "Is Linktree open source?",
    answer:
      "No — Linktree's code isn't public. Kytelink's full source is on GitHub under the MIT license, and you can self-host it or export your page as JSON anytime.",
  },
  {
    question: "Does Kytelink take a cut of my sales?",
    answer:
      "No. Kytelink has no checkout and no seller fees — link out to your store, your payment page, or anywhere else, and keep 100% of what you earn.",
  },
  {
    question: "What does Linktree have that Kytelink doesn't?",
    answer:
      "A built-in store with checkout, a sponsored-links marketplace, and a large integrations catalog. If you need those, Linktree earns its price — Kytelink focuses on the link page itself.",
  },
];

export function LinktreeComparePage() {
  return (
    <ComparePageLayout
      competitor={competitor}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Everything Linktree charges for, free forever."
    />
  );
}

export default LinktreeComparePage;
