import { Head, Html, Main, NextScript } from "next/document";
import { getCdnUrl } from "@kytelink/cdn";
import { API_ORIGIN } from "../lib/env";

export function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href={getCdnUrl("")} crossOrigin="" />
        <link rel="dns-prefetch" href={getCdnUrl("")} />
        <link rel="preconnect" href={API_ORIGIN} crossOrigin="" />
        <link rel="dns-prefetch" href={API_ORIGIN} />

        <link rel="icon" href={getCdnUrl("seo/favicon.ico")} sizes="32x32" />
        <link rel="icon" type="image/svg+xml" href={getCdnUrl("seo/favicon.svg")} />
        <link rel="apple-touch-icon" href={getCdnUrl("seo/apple-touch-icon.png")} />
        <link rel="manifest" href={getCdnUrl("seo/site.webmanifest")} />
        <meta name="theme-color" content="#0EA5E9" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

export default Document;
