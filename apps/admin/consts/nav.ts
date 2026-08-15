type NavSection = "Pulse" | "Directory" | "Trust & safety" | "Platform";

export type NavGlyphName =
  | "gauge"
  | "pulse"
  | "chart"
  | "rocket"
  | "users"
  | "orgs"
  | "shield"
  | "storage"
  | "bell"
  | "log";

/** A page that only appears in the rail while its parent section is open. */
interface NavChild {
  label: string;
  href: string;
  description: string;
  keywords: string;
}

interface NavItem {
  label: string;
  href: string;
  description: string;
  section: NavSection;
  glyph: NavGlyphName;
  keywords: string;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: "/overview",
    description: "Totals and platform health at a glance",
    section: "Pulse",
    glyph: "gauge",
    keywords: "home dashboard stats health totals summary",
  },
  {
    label: "Live",
    href: "/live",
    description: "What's happening right now",
    section: "Pulse",
    glyph: "pulse",
    keywords: "now realtime activity today signups",
  },
  {
    label: "Traffic",
    href: "/traffic",
    description: "Views, referrers, countries, devices",
    section: "Pulse",
    glyph: "chart",
    keywords: "views clicks referrers countries devices analytics charts",
  },
  {
    label: "Growth",
    href: "/growth",
    description: "The funnel from landing page to a kyte people actually click",
    section: "Pulse",
    glyph: "rocket",
    keywords:
      "funnel conversion signups activation landing features use cases retention metrics",
  },
  {
    label: "Users",
    href: "/users",
    description: "Find an account, read its status, change limits",
    section: "Directory",
    glyph: "users",
    keywords: "people accounts email search limits suspend restore status",
  },
  {
    label: "Orgs & kytes",
    href: "/orgs",
    description: "Workspaces and the pages they publish",
    section: "Directory",
    glyph: "orgs",
    keywords: "organizations workspaces teams kytes profiles pages",
  },
  {
    label: "Moderation",
    href: "/moderation",
    description: "Suspensions, abuse reports, and appeals",
    section: "Trust & safety",
    glyph: "shield",
    keywords: "suspended suspension queue reports abuse review cases appeals",
    children: [
      {
        label: "Queue",
        href: "/moderation",
        description: "Pages currently offline, waiting on a decision",
        keywords: "suspended offline queue restore org kyte",
      },
      {
        label: "Review",
        href: "/moderation/review",
        description: "Flip through recent suspensions and rescue wrongful ones",
        keywords: "review mode deck swipe tinder restore wrongful suspension preview",
      },
      {
        label: "Reports",
        href: "/moderation/reports",
        description: "Abuse reports, grouped by the page they're about",
        keywords: "abuse reports complaints spam phishing dismiss",
      },
      {
        label: "Appeals",
        href: "/moderation/appeals",
        description: "People asking us to look at a suspension again",
        keywords: "appeal appeals contest dispute reinstate restore review again",
      },
      {
        label: "Patterns",
        href: "/moderation/patterns",
        description: "Where reports come from, and who repeats",
        keywords: "insights trends patterns domains repeat offenders graph chart",
      },
    ],
  },
  {
    label: "Alerts",
    href: "/alerts",
    description: "Unresolved issues that need an admin",
    section: "Trust & safety",
    glyph: "bell",
    keywords: "issues errors warnings unresolved notifications",
  },
  {
    label: "Storage",
    href: "/storage",
    description: "Bytes by org, plus orphaned files",
    section: "Platform",
    glyph: "storage",
    keywords: "bytes uploads assets files images orphans quota",
    children: [
      {
        label: "Overview",
        href: "/storage",
        description: "How much is stored and how fast it's growing",
        keywords: "total bytes growth median p95",
      },
      {
        label: "By org",
        href: "/storage/orgs",
        description: "Every org ranked by what it holds",
        keywords: "orgs ranked largest over limit quota",
      },
      {
        label: "Orphaned files",
        href: "/storage/orphans",
        description: "Files no kyte references any more",
        keywords: "orphans unreferenced delete reclaim",
      },
    ],
  },
  {
    label: "Audit log",
    href: "/audit",
    description: "Every admin action, with the reason given",
    section: "Platform",
    glyph: "log",
    keywords: "audit history activity trail who did what export",
  },
];

export interface NavGroup {
  section: NavSection;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = NAV_ITEMS.reduce<NavGroup[]>((groups, item) => {
  const existing = groups.find((group) => group.section === item.section);
  if (existing) existing.items.push(item);
  else groups.push({ section: item.section, items: [item] });
  return groups;
}, []);

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A child is current only on an exact match — a parent and its first child
 * share an href, so a prefix match would light up two rows at once.
 */
export function isNavChildActive(pathname: string, href: string): boolean {
  return pathname === href;
}

export interface NavDestination extends NavChild {
  glyph: NavGlyphName;
}

/**
 * Every leaf page, flattened — what the command palette and the mobile strip
 * navigate between. Sections themselves aren't destinations.
 */
export const NAV_DESTINATIONS: NavDestination[] = NAV_ITEMS.flatMap((item) =>
  item.children
    ? item.children.map((child) => ({
        ...child,
        glyph: item.glyph,
        label: `${item.label} · ${child.label}`,
      }))
    : [
        {
          label: item.label,
          href: item.href,
          description: item.description,
          keywords: item.keywords,
          glyph: item.glyph,
        },
      ],
);
