import type { AppProps } from "next/app";
import type { NextComponentType, NextPageContext } from "next";
import { LoadAllScripts } from "@kytelink/ui/scripts";
import { AppProvider } from "../lib/app-context";
import "@fontsource-variable/inter/index.css";
import "../styles/globals.css";

// AppProvider must stay a static import — a next/dynamic here breaks both ways:
// `ssr: false` ships empty documents (no <title>, nothing for a crawler), and
// `ssr: true` records its chunks in _app's loadable manifest, which Next never
// reads for a page, so hydration abandons the server markup. app-context keeps
// its heavy graph behind post-mount imports to keep this cheap for `bare` routes.

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
