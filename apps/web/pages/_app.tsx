import type { AppProps } from "next/app";
import type { NextComponentType, NextPageContext } from "next";
import dynamic from "next/dynamic";
import { LoadAllScripts } from "@kytelink/ui/scripts";
import "@fontsource-variable/inter/index.css";
import "../styles/globals.css";

// Imported lazily, not statically: the `bare` branch below skips *rendering*
// the provider, but a static import still lands its whole graph (framer-motion,
// the tRPC client, better-auth, the toaster) in _app's shared chunk, which every
// route downloads — including the public profile, the most trafficked page here.
// `ssr: false` is load-bearing: server-rendering a lazy provider left the chunk
// unresolved at hydration, so React abandoned hydration, re-rendered the tree a
// second time into #__next, and every framer-motion enter animation stayed stuck
// on its `initial` variant (the login form rendered at opacity 0).
const AppProvider = dynamic(() => import("../lib/app-context").then((m) => m.AppProvider), {
  ssr: false,
});

type PageComponent = NextComponentType<NextPageContext, unknown, object> & { bare?: boolean };

export function App({ Component, pageProps }: AppProps) {
  const page = Component as PageComponent;
  if (page.bare) {
    return (
      <>
        <LoadAllScripts />
        <Component {...pageProps} />
      </>
    );
  }
  return (
    <AppProvider>
      <LoadAllScripts />
      <Component {...pageProps} />
    </AppProvider>
  );
}

export default App;
