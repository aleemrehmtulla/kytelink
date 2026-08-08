import type { DefaultSeoProps, NextSeoProps } from "next-seo";

export const KYTELINK_ORIGIN = "https://kytelink.com";
export const SEO_TITLE_TEMPLATE = "%s | Kytelink";
export const SEO_DEFAULT_TITLE = "Kytelink — a simple link-in-bio, free and open source";
export const SEO_DEFAULT_DESCRIPTION =
  "Kytelink is a free, open-source link-in-bio: custom domains, 12 themes, real privacy-clean analytics, blazing fast.";

export const defaultSeoConfig: DefaultSeoProps = {
  titleTemplate: SEO_TITLE_TEMPLATE,
  defaultTitle: SEO_DEFAULT_TITLE,
  description: SEO_DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Kytelink",
    url: KYTELINK_ORIGIN,
    title: SEO_DEFAULT_TITLE,
    description: SEO_DEFAULT_DESCRIPTION,
  },
  twitter: {
    cardType: "summary_large_image",
    site: "@aleemrehmtulla",
  },
};

export interface ProfileSeoInput {
  username: string;
  displayName: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
}

// Parity strings preserved verbatim from 16-seo.md ("| Kytelink", the
// "Check out {name}'s kyte" description). Canonical is ALWAYS the apex profile
// URL, even for custom domains (founder-confirmed).
export function buildProfileSeo(input: ProfileSeoInput): NextSeoProps {
  const name = input.displayName ?? input.username;
  const title = input.seoTitle ?? `${name} | Kytelink`;
  const description =
    input.seoDescription ?? `Check out ${name}'s kyte to grab their links!`;
  const canonical = `${KYTELINK_ORIGIN}/${input.username}`;

  return {
    title,
    description,
    canonical,
    openGraph: {
      type: "profile",
      url: canonical,
      title,
      description,
      images: input.ogImageUrl
        ? [{ url: input.ogImageUrl, width: 1200, height: 630, alt: title }]
        : undefined,
    },
    twitter: {
      cardType: "summary_large_image",
    },
  };
}
