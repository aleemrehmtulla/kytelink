import { ComparePageLayout } from "../../components/compare/compare-page-layout";
import { getCompetitor } from "../../consts/competitors";

const competitor = getCompetitor("beacons");

const sections = [
  {
    heading: "How the fees work",
    paragraphs: [
      "Beacons funds a genuinely large product — store, email, AI tools — with a 9% fee on sales made through its free and $10-a-month Creator plans, on top of Stripe's processing fees. The fee reaches zero on the $30-a-month plans, which is also where branding removal lives.",
      "Kytelink charges nothing because there's nothing to charge for: no checkout, no transaction fees, no revenue share. Link out to your store, your Stripe page, or your Gumroad, and every dollar stays where it belongs.",
    ],
  },
  {
    heading: "Portability is the quiet difference",
    paragraphs: [
      "Whatever platform you pick, it's worth checking the exit before you move in. Domains bought through Beacons are registered by Beacons — check the transfer terms before buying one there — and the page, list, and storefront live inside the app.",
      "Kytelink is built around the exit being easy: open-source code, JSON export of your links and settings, and custom domains you connect yourself — you keep the registrar login, we just serve the page. Self-host it and there's no platform to leave at all.",
    ],
  },
  {
    heading: "All-in-one, or just the link page",
    paragraphs: [
      "Beacons' store, email marketing, media kit, and invoicing are real, well-built features, and a creator running a whole business from one dashboard may happily pay for them. Kytelink doesn't try to be your commerce stack.",
      "It tries to be the best possible version of the thing everyone actually needs: a fast, beautiful page for your links, with honest analytics and nothing metered. Pair it with whichever store you already like.",
    ],
  },
  {
    heading: "How to switch without losing your store",
    paragraphs: [
      "You don't have to close your storefront to move your bio link. Move the link first: rebuild it on Kytelink, connect your domain (free), and point your social bios at the new page. Your Beacons store keeps working — it's just one of the links now.",
      "Then move commerce at your own pace, if you want to at all: Gumroad, Lemon Squeezy, Stripe payment links, Shopify — anything with a URL slots straight into your Kytelink, with no fee added on top. If you bought a domain through Beacons, start its transfer early; that's the one step with a waiting period.",
    ],
  },
];

const faqs = [
  {
    question: "Is Kytelink a free alternative to Beacons?",
    answer:
      "Yes. Every Kytelink feature — custom domains, analytics, scheduling, teams, watermark removal — is free, with nothing reserved for a higher tier.",
  },
  {
    question: "Does Kytelink take a percentage of sales like Beacons?",
    answer:
      "No. Beacons charges 9% on its free and $10/month plans (as of August 2026); Kytelink has no checkout and no fees — you link to your own store and keep 100%.",
  },
  {
    question: "Can I use my own domain for free on Kytelink?",
    answer:
      "Yes. Connect any domain you own with a few DNS records, free. Beacons bundles a domain from its $10/month plan — registered through Beacons, so check the transfer terms if you may move it later.",
  },
  {
    question: "Is Beacons open source?",
    answer:
      "No — Beacons' code isn't public. Kytelink's full source is on GitHub under the MIT license, and you can self-host the entire product.",
  },
  {
    question: "Can Kytelink sell digital products?",
    answer:
      "Not natively, and that's deliberate. Kytelink links out to the store or payment tool you choose, so there's no extra fee in the middle.",
  },
  {
    question: "How hard is it to switch from Beacons?",
    answer:
      "Rebuild your links in the editor, point your domain at Kytelink, and update your bios. Most pages are live again in minutes.",
  },
];

export function BeaconsComparePage() {
  return (
    <ComparePageLayout
      competitor={competitor}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Your links, your sales, your 100%."
    />
  );
}

export default BeaconsComparePage;
