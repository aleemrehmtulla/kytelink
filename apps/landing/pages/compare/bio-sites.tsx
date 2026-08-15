import { ComparePageLayout } from "../../components/compare/compare-page-layout";
import { getCompetitor } from "../../consts/competitors";

const competitor = getCompetitor("bio-sites");

const sections = [
  {
    heading: "Two kinds of free",
    paragraphs: [
      "Bio Sites is genuinely free and well made, and that deserves saying plainly. It's free because it introduces you to Squarespace's excellent website builder — a perfectly reasonable model, and worth understanding when you choose where your bio link lives.",
      "Kytelink is free for a different reason — it's an open-source project with nothing further to sell. The whole product is the product: links, themes, analytics, scheduling, domains, and teams.",
    ],
  },
  {
    heading: "Where your page actually lives",
    paragraphs: [
      "Bio Sites pages live at a bio.site address — a domain you own can forward there, but the bio.site URL is what people see and share. There's currently no data export or API, and pages are single-user.",
      "Kytelink serves your page directly on any domain you own, free. Your links and settings export as JSON, organizations support real roles, and the code itself is public — the difference between using a page and owning one.",
    ],
  },
  {
    heading: "Longevity, guaranteed two different ways",
    paragraphs: [
      "Products inside large companies evolve with their priorities — the category's cautionary tale is Bento, which Linktree acquired and shut down in early 2026, and Bio Sites' own Pro plan was retired along the way. That's not a knock on Squarespace; priorities shift inside every large company.",
      "An open-source page offers a different guarantee: it can't be discontinued out from under you. If Kytelink's hosted service ever ended, the code, your export, and your self-hosted instance would all keep working.",
    ],
  },
  {
    heading: "From bio.site to a page that's yours",
    paragraphs: [
      "Since Bio Sites has no export, the move is a short manual rebuild: recreate your links in the Kytelink editor, match the vibe with a theme and accent, and add the email or booking links you already use as regular links.",
      "The upgrade moment is the URL. Instead of forwarding a domain to a bio.site address, connect your domain to Kytelink and the page actually lives there — the address people see, share, and remember is yours. Update your bios and the switch is complete.",
    ],
  },
];

const faqs = [
  {
    question: "Is Bio Sites really free?",
    answer:
      "Yes — Squarespace's Bio Sites is free to create and publish. The difference is ownership: custom domains, data export, teams, and open-source code are where Kytelink pulls ahead.",
  },
  {
    question: "Can Bio Sites use my own domain?",
    answer:
      "Only as forwarding — visitors still land on your bio.site URL. Kytelink serves your page directly on your own domain, free.",
  },
  {
    question: "Can I export my data from Bio Sites?",
    answer:
      "No — there's no export or API. Kytelink exports your links and settings as JSON anytime, and the platform itself is open source.",
  },
  {
    question: "Is Bio Sites open source?",
    answer:
      "No. Bio Sites is a closed product inside Squarespace. Kytelink's full source is public on GitHub and can be self-hosted with every feature.",
  },
  {
    question: "Does Kytelink support teams?",
    answer:
      "Yes — organizations with roles are free, so an agency or manager can run pages without shared logins. Bio Sites is single-user.",
  },
  {
    question: "Why choose Kytelink over a Squarespace product?",
    answer:
      "If you want a full Squarespace website, Bio Sites is a fine companion. If you want the best standalone link-in-bio you own outright, that's exactly what Kytelink is.",
  },
];

export function BioSitesComparePage() {
  return (
    <ComparePageLayout
      competitor={competitor}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Free, open source, and entirely yours."
    />
  );
}

export default BioSitesComparePage;
