import { Head, Html, Main, NextScript } from "next/document";
import { getCdnUrl } from "@kytelink/cdn";

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.kytelink.com";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.kytelink.com";

export function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href={CDN_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={CDN_URL} />
        <link rel="preconnect" href={API_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={API_URL} />

        <link rel="icon" href={getCdnUrl("seo/favicon.ico")} sizes="32x32" />
        <link rel="icon" type="image/svg+xml" href={getCdnUrl("seo/favicon.svg")} />
        <link rel="apple-touch-icon" href={getCdnUrl("seo/apple-touch-icon.png")} />
        <link rel="manifest" href={getCdnUrl("seo/site.webmanifest")} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

export default Document;
