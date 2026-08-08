import { Head, Html, Main, NextScript } from "next/document";

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
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

export default Document;
