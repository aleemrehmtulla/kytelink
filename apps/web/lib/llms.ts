import type { STATIC_SITEMAP_PATHS } from "@kytelink/schemas";
import { GITHUB_REPO_URL } from "@kytelink/ui/seo";
import { publicWebUrl } from "./env";

type MarketingPath = (typeof STATIC_SITEMAP_PATHS)[number];

interface LlmsLink {
  path: MarketingPath;
  title: string;
  note: string;
}

interface LlmsSection {
  heading: string;
  links: LlmsLink[];
}

const SUMMARY =
  "A free, open-source link-in-bio platform: one page that holds every link, social icon, and theme you want to share.";

const CONTEXT = [
  "Every feature is free forever — custom domains, themes, analytics, and organizations included. There is no paid tier, no trial, and nothing held back behind an upgrade.",
  "The whole stack is MIT-licensed and self-hostable, so an instance can run on your own infrastructure with the same feature set as the hosted one.",
  "Profile pages at kytelink.com/<username> are user-generated content rather than documentation, and robots.txt keeps them out of AI training and AI search corpora.",
];

const SECTIONS: LlmsSection[] = [
  {
    heading: "Product",
    links: [
      {
        path: "/",
        title: "Kytelink",
        note: "What a Kytelink page is, what it costs, and how to publish one.",
      },
      {
        path: "/pricing",
        title: "Pricing",
        note: "Kytelink is 100% free: every feature, forever, for everyone — no paid plan of any kind.",
      },
      {
        path: "/self-hosting",
        title: "Self-hosting",
        note: "Clone, install, run the setup wizard — plus the env-var reference and capability matrix.",
      },
    ],
  },
  {
    heading: "Features",
    links: [
      {
        path: "/features/analytics",
        title: "Analytics",
        note: "Cookie-free page and link analytics, free for every account.",
      },
      {
        path: "/features/custom-domains",
        title: "Custom domains",
        note: "Serve your page from your own domain at no cost.",
      },
      {
        path: "/features/themes",
        title: "Themes",
        note: "Twelve themes plus custom accent colors and fonts.",
      },
      {
        path: "/features/teams",
        title: "Teams",
        note: "Organizations, roles, and per-kyte access for agencies.",
      },
      {
        path: "/features/scheduled-publishing",
        title: "Scheduled publishing",
        note: "Queue a page change to go live at a set time.",
      },
      {
        path: "/features/open-source",
        title: "Open source",
        note: "The full stack on GitHub under the MIT license.",
      },
    ],
  },
  {
    heading: "Use cases",
    links: [
      {
        path: "/use-cases/creators",
        title: "Creators",
        note: "One link for every platform a creator posts on.",
      },
      {
        path: "/use-cases/musicians",
        title: "Musicians",
        note: "Streaming links, tour dates, and merch in one page.",
      },
      {
        path: "/use-cases/agencies",
        title: "Agencies",
        note: "Running many client pages from one organization.",
      },
    ],
  },
  {
    heading: "Comparisons",
    links: [
      {
        path: "/compare",
        title: "All comparisons",
        note: "Kytelink next to every major link-in-bio tool.",
      },
      {
        path: "/compare/linktree",
        title: "vs Linktree",
        note: "Custom domains Linktree does not offer on any plan, plus free analytics and branding removal.",
      },
      {
        path: "/compare/beacons",
        title: "vs Beacons",
        note: "A focused link page versus a creator-monetization suite.",
      },
      {
        path: "/compare/bio-link",
        title: "vs Bio.link",
        note: "Open source and self-hostable versus a closed free tier.",
      },
      {
        path: "/compare/carrd",
        title: "vs Carrd",
        note: "A purpose-built link page versus a one-page site builder.",
      },
    ],
  },
  {
    heading: "Legal and trust",
    links: [
      {
        path: "/legal",
        title: "Legal index",
        note: "Every policy in one place.",
      },
      {
        path: "/terms-of-service",
        title: "Terms of service",
        note: "The rules for using the hosted service.",
      },
      {
        path: "/privacy-policy",
        title: "Privacy policy",
        note: "What is collected, what is not, and why analytics stay cookie-free.",
      },
      {
        path: "/anti-phishing",
        title: "Anti-phishing",
        note: "How abuse is reported, reviewed, and appealed.",
      },
    ],
  },
];

export function buildLlmsTxt(): string {
  const base = publicWebUrl().replace(/\/+$/, "");
  const lines = [
    "# Kytelink",
    "",
    `> ${SUMMARY}`,
    "",
    ...CONTEXT.flatMap((line) => [line, ""]),
  ];

  for (const section of SECTIONS) {
    lines.push(`## ${section.heading}`, "");
    for (const link of section.links) {
      lines.push(`- [${link.title}](${base}${link.path}): ${link.note}`);
    }
    lines.push("");
  }

  lines.push(
    "## Source",
    "",
    `- [GitHub repository](${GITHUB_REPO_URL}): the entire stack, MIT-licensed.`,
    "",
  );

  return lines.join("\n");
}
