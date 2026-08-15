import type { CompareRow } from "../components/compare/compare-table";

export type CompetitorSlug =
  | "linktree"
  | "lnk-bio"
  | "beacons"
  | "carrd"
  | "milkshake"
  | "bio-sites"
  | "linkstack"
  | "littlelink";

export interface CompetitorMeta {
  slug: CompetitorSlug;
  name: string;
  navTagline: string;
  hubBlurb: string;
  seoTitle: string;
  seoDescription: string;
  headline: string;
  story: string;
  rows: CompareRow[];
  tableFootnote: string;
}

// Competitor pricing and plan boundaries move often — each table carries an
// as-of date in its footnote; re-verify against the vendor before updating.
export const COMPETITORS: readonly CompetitorMeta[] = [
  {
    slug: "linktree",
    name: "Linktree",
    navTagline: "Everything Linktree charges for, free.",
    hubBlurb:
      "Linktree is the polished original, but custom domains aren't offered and hiding its logo needs a paid plan. Kytelink includes both, free.",
    seoTitle: "Kytelink vs Linktree — open-source Linktree alternative",
    seoDescription:
      "A free, open-source Linktree alternative: custom domains, analytics, scheduling, and no branding — $0 forever, self-hostable, no paid tiers.",
    headline: "The open-source Linktree alternative",
    story:
      "Linktree invented the category and is still a polished product. The differences are price and ownership: hiding its logo needs a paid plan, and no plan offers a custom domain. Kytelink includes the whole product for $0, because it's open source.",
    rows: [
      { label: "Price for every feature", kytelink: "$0, forever", competitor: "Up to $39/mo" },
      { label: "Remove platform branding", kytelink: "Free, one click", competitor: "Pro, from $13.50/mo" },
      { label: "Custom domain", kytelink: "Included free", competitor: "Not offered" },
      { label: "Per-link analytics", kytelink: "Free", competitor: "Basic free; deeper paid" },
      { label: "Link scheduling", kytelink: "Free", competitor: "From $7.50/mo" },
      { label: "Selling through the page", kytelink: "Link out to any store", competitor: "Built-in, 12%/9%/0% fee" },
      { label: "Teams & roles", kytelink: "Free", competitor: "Agency, custom pricing" },
      { label: "Open source", kytelink: true, competitor: false },
      { label: "Self-hosting", kytelink: true, competitor: false },
      { label: "Data export", kytelink: "JSON, free", competitor: "CSV, Pro plans" },
    ],
    tableFootnote:
      "Linktree pricing and plan boundaries as of August 2026 — verify current details at linktr.ee.",
  },
  {
    slug: "lnk-bio",
    name: "Lnk.bio",
    navTagline: "One-time payments are good. Owning it is better.",
    hubBlurb:
      "Lnk.bio's lifetime pricing is genuinely fair. Kytelink goes one further: free, open source, and self-hostable.",
    seoTitle: "Kytelink vs Lnk.bio — open-source Lnk.bio alternative",
    seoDescription:
      "Kytelink vs Lnk.bio: both skip subscriptions, but Kytelink is fully free and open source — custom domains included, self-hosting, and your data as JSON.",
    headline: "The open-source Lnk.bio alternative",
    story:
      "Lnk.bio is the anti-subscription link-in-bio, and honestly, we respect it. Kytelink just takes the idea further: every feature free, the code on GitHub, and your page on your own server if you want it.",
    rows: [
      { label: "Price for every feature", kytelink: "$0, forever", competitor: "$24.99 one-time + add-ons" },
      { label: "Remove platform branding", kytelink: "Free, one click", competitor: "$24.99 one-time" },
      { label: "Custom domain", kytelink: "Included free", competitor: "+$39.99/yr add-on" },
      { label: "Link scheduling", kytelink: "Free", competitor: "Mini plan and up" },
      { label: "Advanced analytics", kytelink: "Free", competitor: "Paid plans" },
      { label: "Roles on one page", kytelink: "Free", competitor: "Separate logins only" },
      { label: "Open source", kytelink: true, competitor: false },
      { label: "Self-hosting", kytelink: true, competitor: false },
      { label: "Data export", kytelink: "JSON, free", competitor: ".xlsx on paid plans" },
    ],
    tableFootnote:
      "Lnk.bio pricing as of August 2026 — verify current details at lnk.bio.",
  },
  {
    slug: "carrd",
    name: "Carrd",
    navTagline: "Same indie spirit, purpose-built for links.",
    hubBlurb:
      "Carrd is a lovely one-page site builder. Kytelink is a purpose-built link page — with analytics, scheduling, and the code in the open.",
    seoTitle: "Kytelink vs Carrd — open-source Carrd alternative",
    seoDescription:
      "Kytelink vs Carrd for link-in-bio pages: free custom domains, native click analytics, and open-source code vs Carrd's paid tiers and closed platform.",
    headline: "The open-source Carrd alternative",
    story:
      "Carrd is a great one-page site builder with real indie spirit. But a link-in-bio wants click analytics, scheduling, and a domain without a paid tier — Kytelink ships all of it, and the code is public.",
    rows: [
      { label: "Price for every feature", kytelink: "$0, forever", competitor: "$9–49/yr, annual only" },
      { label: "Remove platform branding", kytelink: "Free, one click", competitor: "From $9/yr" },
      { label: "Custom domain", kytelink: "Included free", competitor: "From $19/yr" },
      { label: "Native click analytics", kytelink: "Free", competitor: false },
      { label: "Scheduled publishing", kytelink: "Free", competitor: false },
      { label: "Teams & roles", kytelink: "Free", competitor: false },
      { label: "Open source", kytelink: true, competitor: false },
      { label: "Self-hosting", kytelink: true, competitor: false },
      { label: "Data export", kytelink: "JSON, free", competitor: "Site download, $49/yr" },
    ],
    tableFootnote:
      "Carrd pricing and tier boundaries as of August 2026 — verify current details at carrd.co.",
  },
  {
    slug: "beacons",
    name: "Beacons",
    navTagline: "A free page beside any store.",
    hubBlurb:
      "Beacons is a genuinely full creator suite, with a 9% sales fee on plans below $30/mo. Kytelink doesn't process sales at all — pair a free page with any store.",
    seoTitle: "Kytelink vs Beacons — open-source Beacons alternative",
    seoDescription:
      "A free, open-source Beacons alternative: no 9% transaction fee, no $30/mo to remove branding, free custom domains, and code you can self-host.",
    headline: "The open-source Beacons alternative",
    story:
      "Beacons packs a store, email, and AI into one impressive app, with a 9% fee on sales unless you're on a $30-a-month plan. Kytelink is the calmer take: a fast, free link page you own outright, pointing at whichever store you like.",
    rows: [
      { label: "Price for every feature", kytelink: "$0, forever", competitor: "Up to $90/mo" },
      { label: "Remove platform branding", kytelink: "Free, one click", competitor: "$30/mo plans" },
      { label: "Custom domain", kytelink: "Included free", competitor: "From $10/mo, registered by Beacons" },
      { label: "Selling through the page", kytelink: "Link out to any store", competitor: "Built-in, 9% fee below $30/mo" },
      { label: "Per-link analytics", kytelink: "Free", competitor: "Basic free; deeper paid" },
      { label: "Scheduled publishing", kytelink: "Free", competitor: "$30/mo plans" },
      { label: "Open source", kytelink: true, competitor: false },
      { label: "Self-hosting", kytelink: true, competitor: false },
      { label: "Data export", kytelink: "JSON, free", competitor: "Audience CSV only" },
    ],
    tableFootnote:
      "Beacons pricing and fees as of August 2026 — verify current details at beacons.ai.",
  },
  {
    slug: "milkshake",
    name: "Milkshake",
    navTagline: "Edit from any browser, phone included.",
    hubBlurb:
      "Milkshake is a charming phone app, and editing is app-only by design. Kytelink adds a full web editor — and it's open source.",
    seoTitle: "Kytelink vs Milkshake — open-source Milkshake alternative",
    seoDescription:
      "A free, open-source Milkshake alternative with a real web editor: edit from any device, use your own domain free, and export your page anytime.",
    headline: "The open-source Milkshake alternative",
    story:
      "Milkshake's swipeable cards are genuinely charming, and its phone-first editor is a deliberate choice. Kytelink adds the other half: a full web editor, your own domain, and the source code.",
    rows: [
      { label: "Edit from any browser", kytelink: true, competitor: false },
      { label: "Price for every feature", kytelink: "$0, forever", competitor: "$0–$10/mo" },
      { label: "Remove platform branding", kytelink: "Free, one click", competitor: "From $2.99/mo" },
      { label: "Custom domain", kytelink: "Included free", competitor: "Top tier only" },
      { label: "Selling through the page", kytelink: "Link out to any store", competitor: "Built-in, 7–12% fee" },
      { label: "Analytics window", kytelink: "90 days free", competitor: "30 days free" },
      { label: "Teams & roles", kytelink: "Free", competitor: false },
      { label: "Open source", kytelink: true, competitor: false },
      { label: "Self-hosting", kytelink: true, competitor: false },
      { label: "Data export", kytelink: "JSON, free", competitor: "Insights CSV, Pro tiers" },
    ],
    tableFootnote:
      "Milkshake pricing and fees as of August 2026 — verify current details at milkshake.app.",
  },
  {
    slug: "bio-sites",
    name: "Bio Sites",
    navTagline: "Free like Bio Sites, plus real ownership.",
    hubBlurb:
      "Squarespace's Bio Sites is genuinely free and well made. Kytelink adds real custom domains, data export, teams — and open-source code.",
    seoTitle: "Kytelink vs Bio Sites — open-source Bio Sites alternative",
    seoDescription:
      "Kytelink vs Squarespace Bio Sites: both are free, but Kytelink adds real custom domains, data export, teams, and open-source code you can self-host.",
    headline: "The open-source Bio Sites alternative",
    story:
      "Bio Sites is a genuinely free, well-made page from Squarespace. Kytelink matches the price and adds the ownership: a domain that's really yours, data export, team roles, and code that's public.",
    rows: [
      { label: "Price for every feature", kytelink: "$0, forever", competitor: "$0" },
      { label: "Custom domain", kytelink: "Included free", competitor: "Forwarding only" },
      { label: "Remove platform branding", kytelink: "Free, one click", competitor: false },
      { label: "Teams & roles", kytelink: "Free", competitor: false },
      { label: "Scheduled publishing", kytelink: "Free", competitor: false },
      { label: "Open source", kytelink: true, competitor: false },
      { label: "Self-hosting", kytelink: true, competitor: false },
      { label: "Data export", kytelink: "JSON, free", competitor: false },
    ],
    tableFootnote:
      "Bio Sites plan details as of August 2026 — verify current details at biosites.com.",
  },
  {
    slug: "linkstack",
    name: "LinkStack",
    navTagline: "Fellow open source — different trade-offs.",
    hubBlurb:
      "LinkStack is a solid self-hosted PHP app. Kytelink adds a free hosted version, scheduling, and team roles — also fully open source.",
    seoTitle: "Kytelink vs LinkStack — open-source link-in-bio compared",
    seoDescription:
      "Two open-source Linktree alternatives compared honestly: LinkStack's self-hosted PHP app vs Kytelink's free hosted version, scheduling, and team roles.",
    headline: "Kytelink vs LinkStack, open source vs open source",
    story:
      "LinkStack is real open source with a real admin panel, and if you want a PHP app on shared hosting, it's a fine choice. Kytelink's difference: a free hosted version with every feature, scheduled publishing, and team roles.",
    rows: [
      { label: "Open source", kytelink: "MIT", competitor: "AGPL-3.0" },
      { label: "Self-hosting", kytelink: true, competitor: true },
      { label: "Web editor & admin", kytelink: true, competitor: true },
      { label: "Built-in analytics", kytelink: true, competitor: true },
      { label: "Hosted version", kytelink: "Free, every feature", competitor: "Paid plans" },
      { label: "Custom domain, hosted", kytelink: "Included free", competitor: "Paid hosted tiers" },
      { label: "Scheduled publishing", kytelink: "Free", competitor: "Not advertised" },
      { label: "Roles on one page", kytelink: "Free", competitor: "Multi-user accounts only" },
      { label: "Stack", kytelink: "TypeScript + Postgres", competitor: "PHP/Laravel + SQLite/MySQL" },
    ],
    tableFootnote:
      "LinkStack details as of August 2026 — verify current details at linkstack.org.",
  },
  {
    slug: "littlelink",
    name: "LittleLink",
    navTagline: "Same MIT spirit, plus an editor and analytics.",
    hubBlurb:
      "LittleLink is a tiny MIT-licensed HTML template you edit by hand. Kytelink is a full product — editor, analytics, scheduling — equally open.",
    seoTitle: "Kytelink vs LittleLink — open-source link-in-bio compared",
    seoDescription:
      "LittleLink's hand-edited static template vs Kytelink's open-source platform with a web editor, analytics, scheduling, and a free hosted version.",
    headline: "Kytelink vs LittleLink, template vs platform",
    story:
      "LittleLink is a beautifully minimal idea: a static HTML page, 100+ brand buttons, host it anywhere free. Kytelink is for the day you want an editor, analytics, and scheduling — without giving up open source.",
    rows: [
      { label: "Open source", kytelink: "MIT", competitor: "MIT" },
      { label: "Self-hosting", kytelink: true, competitor: true },
      { label: "Price", kytelink: "$0, forever", competitor: "$0" },
      { label: "Web editor", kytelink: true, competitor: "Edit the HTML" },
      { label: "Built-in analytics", kytelink: true, competitor: false },
      { label: "Hosted version", kytelink: "Free, every feature", competitor: false },
      { label: "Scheduled publishing", kytelink: "Free", competitor: false },
      { label: "Teams & roles", kytelink: "Free", competitor: false },
      { label: "Custom domain", kytelink: "Included free", competitor: "Via your static host" },
    ],
    tableFootnote:
      "LittleLink details as of August 2026 — verify current details at littlelink.io.",
  },
] as const;

export function getCompetitor(slug: CompetitorSlug): CompetitorMeta {
  const competitor = COMPETITORS.find((item) => item.slug === slug);
  if (!competitor) throw new Error(`Unknown competitor slug: ${slug}`);
  return competitor;
}
