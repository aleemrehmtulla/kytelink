import type { NextSeoProps } from "next-seo";
import { KYTELINK_ORIGIN } from "@kytelink/ui";
import { getCdnUrl } from "@kytelink/cdn";

const DEFAULT_OG_IMAGE = getCdnUrl("seo/og-image.png");

// Every landing page gets a unique title/description/canonical (16-seo.md), but
// they all share one OG raster — there is no per-page image pipeline.
export function buildPageSeo(input: {
  path: string;
  title: string;
  description: string;
  ogImage?: string;
}): NextSeoProps {
  const canonical = `${KYTELINK_ORIGIN}${input.path}`;
  const image = input.ogImage ?? DEFAULT_OG_IMAGE;

  return {
    title: input.title,
    description: input.description,
    canonical,
    openGraph: {
      type: "website",
      url: canonical,
      title: input.title,
      description: input.description,
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
    },
    twitter: {
      cardType: "summary_large_image",
    },
  };
}
