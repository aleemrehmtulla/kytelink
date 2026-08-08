import { Head, Html, Main, NextScript } from "next/document";

// Runs before first paint so a collapsed rail never renders at full width and
// then snaps. Keep the key in sync with components/shell/side-nav.tsx. It has
// to live in <body>, not <Head> — an inline script inside next/document's
// <Head> stops the page hydrating entirely on Next 16.
const NAV_PREFERENCE = `try{if(localStorage.getItem('kytelink.admin.nav-collapsed')==='1')document.documentElement.dataset.nav='collapsed'}catch(e){}`;

export function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: NAV_PREFERENCE }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

export default Document;
