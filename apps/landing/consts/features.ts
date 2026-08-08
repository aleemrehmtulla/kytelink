import type { LucideIcon } from "lucide-react";
import { BarChart3, CalendarClock, Code, Globe, Palette, Users } from "lucide-react";

export type FeatureSlug =
  | "analytics"
  | "custom-domains"
  | "themes"
  | "teams"
  | "scheduled-publishing"
  | "open-source";

export interface FeatureMeta {
  slug: FeatureSlug;
  title: string;
  tagline: string;
  cardDescription: string;
  icon: LucideIcon;
  seoTitle: string;
  seoDescription: string;
}

export const FEATURES: readonly FeatureMeta[] = [
  {
    slug: "analytics",
    title: "Analytics",
    tagline: "Know what's working, without spying on anyone.",
    cardDescription: "Real-time views, clicks, referrers, and devices — privacy-clean.",
    icon: BarChart3,
    seoTitle: "Analytics for your link-in-bio",
    seoDescription:
      "Real analytics for your Kytelink: views, link clicks, referrers, devices, and countries — hashed IPs, no ad trackers.",
  },
  {
    slug: "custom-domains",
    title: "Custom domains",
    tagline: "Your links, your domain.",
    cardDescription: "Point any domain you own at your kyte in a few DNS records.",
    icon: Globe,
    seoTitle: "Custom domains for your link-in-bio",
    seoDescription: "Connect your own domain to your Kytelink profile — free, with clear DNS instructions.",
  },
  {
    slug: "themes",
    title: "Themes",
    tagline: "Twelve looks. Every font, every accent.",
    cardDescription: "From clean and minimal to glassy dark — pick a theme that fits.",
    icon: Palette,
    seoTitle: "12 themes for your link-in-bio",
    seoDescription: "Twelve built-in themes, custom fonts, and accent colors for your Kytelink profile.",
  },
  {
    slug: "teams",
    title: "Teams",
    tagline: "Run every client's page from one login.",
    cardDescription: "Invite your team, assign roles, revoke access in one click.",
    icon: Users,
    seoTitle: "Teams and roles for your link-in-bio",
    seoDescription: "Invite teammates, assign granular roles, and manage every kyte from one organization login.",
  },
  {
    slug: "scheduled-publishing",
    title: "Scheduled publishing",
    tagline: "Set it, and it goes live on time.",
    cardDescription: "Queue up the next drop and walk away — it publishes itself.",
    icon: CalendarClock,
    seoTitle: "Scheduled publishing for your link-in-bio",
    seoDescription: "Schedule your Kytelink profile to publish automatically at a future date and time.",
  },
  {
    slug: "open-source",
    title: "Open source",
    tagline: "Nothing closed. No mandatory SaaS.",
    cardDescription: "Self-host the whole thing in about 15 minutes, or use our hosted version.",
    icon: Code,
    seoTitle: "Free and open source",
    seoDescription:
      "Kytelink is fully open source and self-hostable — every service has a drop-in open-source equivalent.",
  },
] as const;

export function getFeature(slug: FeatureSlug): FeatureMeta {
  const feature = FEATURES.find((item) => item.slug === slug);
  if (!feature) throw new Error(`Unknown feature slug: ${slug}`);
  return feature;
}
