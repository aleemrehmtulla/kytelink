import { ComparePageLayout } from "../../components/compare/compare-page-layout";
import { getCompetitor } from "../../consts/competitors";

const competitor = getCompetitor("lnk-bio");

const sections = [
  {
    heading: "Lnk.bio's pricing is genuinely fair",
    paragraphs: [
      "Lnk.bio is one of the good ones: plan prices unchanged since 2016, lifetime plans instead of subscriptions, and no platform cut of your sales. That's rare, and it deserves saying plainly.",
      "The comparison isn't about cost — $24.99 once is fair. It's about what you get for it: Lnk.bio is a closed platform, so your page, your data, and your URL live on its infrastructure, with no export of the page and no self-host option.",
    ],
  },
  {
    heading: "Free is nice. Owning it is the point.",
    paragraphs: [
      "On Lnk.bio, removing the branding is a one-time purchase, a custom domain is a $39.99-a-year add-on, and advanced analytics start on the paid tiers. On Kytelink all of it is simply included: the watermark toggle, the domain, and the whole analytics dashboard.",
      "More importantly, Kytelink's source code is public. You can read exactly how your analytics are collected, export your page as JSON, or run the entire platform on your own server. No lifetime plan can promise more lifetime than that.",
    ],
  },
  {
    heading: "Same values, different guarantees",
    paragraphs: [
      "Lnk.bio is a small independent company, and its longevity depends on staying one. Kytelink is a free, open-source project — if the hosted service ever disappeared, the code, your data, and your page would all still be yours to run anywhere.",
      "For teams there's a practical gap too: Kytelink organizations come with roles, so a manager, editor, or agency can work on one page without sharing a login. Lnk.bio's agency plans manage multiple accounts, but each stays a separate login on its own page.",
    ],
  },
  {
    heading: "Moving over from Lnk.bio",
    paragraphs: [
      "Rebuilding a Lnk.bio page on Kytelink is a copy-paste session: your links, your bio, your avatar, one of 12 themes with your fonts and accent. If you paid for the Unique tier, nothing is wasted — it was a one-time purchase, and your new page simply lives somewhere you own.",
      "If you were paying the yearly domain add-on, connect the same domain to Kytelink instead — it's included, so the $39.99 a year goes back in your pocket. Update your social bios last and the move is done with zero downtime.",
    ],
  },
];

const faqs = [
  {
    question: "Is Kytelink cheaper than Lnk.bio?",
    answer:
      "Yes — Kytelink is $0 with everything included. Lnk.bio's paid tiers are one-time and inexpensive, but branding removal, custom domains, and advanced analytics each carry a price.",
  },
  {
    question: "Does Lnk.bio charge for custom domains?",
    answer:
      "Yes — using your own domain on Lnk.bio is a $39.99/year add-on (as of August 2026). Kytelink includes custom domains free.",
  },
  {
    question: "Is Lnk.bio open source?",
    answer:
      "No. Lnk.bio is independent and fairly priced, but closed source. Kytelink's code is public on GitHub and can be self-hosted with every feature included.",
  },
  {
    question: "Can I export my data from Kytelink?",
    answer:
      "Yes — your links and settings export as JSON at any time. Combined with the open-source code, there's no lock-in to leave behind.",
  },
  {
    question: "Does Kytelink support teams?",
    answer:
      "Yes. Create an organization, invite teammates, and give each one a role on the same page — free. Lnk.bio's agency plans manage separate accounts, each with its own login.",
  },
  {
    question: "Why is Kytelink free when Lnk.bio charges?",
    answer:
      "Kytelink is an open-source passion project with no business model attached. There's no plan to grow into a paywall.",
  },
];

export function LnkBioComparePage() {
  return (
    <ComparePageLayout
      competitor={competitor}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="No subscriptions, no lifetime plans — just free."
    />
  );
}

export default LnkBioComparePage;
