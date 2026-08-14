import type { AppProps } from "next/app";
import Head from "next/head";
import { Inter } from "next/font/google";
import { LoadAllScripts } from "@kytelink/ui/scripts";
import { AppShell } from "../components/shell/app-shell";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

export function App({ Component, pageProps }: AppProps) {
  return (
    <div className={inter.variable}>
      <Head>
        <title>Kytelink admin</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <LoadAllScripts />
      <AppShell>
        <Component {...pageProps} />
      </AppShell>
    </div>
  );
}

export default App;
