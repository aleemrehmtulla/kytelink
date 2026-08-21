import Head from "next/head";
import { buildProfileSeo } from "@kytelink/ui/seo";
import type { ProfileContent } from "@kytelink/schemas";
import { serializeJsonLd } from "../../lib/json-ld";

export interface ProfileHeadProps {
  username: string;
  content: ProfileContent;
  ogImageUrl: string | null;
  noindex?: boolean;
  avatarUrl?: string | null;
  dateModified?: string | null;
}

export function ProfileHead({
  username,
  content,
  ogImageUrl,
  noindex = false,
  avatarUrl = null,
  dateModified = null,
}: ProfileHeadProps) {
  const seo = buildProfileSeo({
    username,
    displayName: content.displayName,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    ogImageUrl,
  });

  const name = content.displayName ?? username;
  const sameAs = content.icons.map((icon) => icon.url).filter((url): url is string => Boolean(url));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    ...(dateModified ? { dateModified } : {}),
    mainEntity: {
      "@type": "Person",
      name,
      alternateName: username,
      url: seo.canonical,
      ...(avatarUrl ? { image: avatarUrl } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
    },
  };

  return (
    <Head>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description ?? ""} />
      <link rel="canonical" href={seo.canonical} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
      <meta property="og:type" content="profile" />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description ?? ""} />
      <meta property="og:url" content={seo.canonical} />
      {ogImageUrl ? (
        <>
          <meta property="og:image" content={ogImageUrl} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
        </>
      ) : null}
      <meta name="twitter:card" content="summary_large_image" />
      {avatarUrl ? (
        <link rel="preload" as="image" href={avatarUrl} fetchPriority="high" />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </Head>
  );
}
