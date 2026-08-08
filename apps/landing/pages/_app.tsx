import { useEffect } from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { Inter } from "next/font/google";
import { DefaultSeo } from "next-seo";
import { MotionConfig } from "framer-motion";
import { defaultSeoConfig } from "@kytelink/ui";
import { WebsiteOrganizationJsonLd } from "../components/seo/json-ld";
import { captureRefFromLocation } from "../lib/ref-cookie";
import { trackHitLanding } from "../lib/beacon";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const ref = captureRefFromLocation();
    trackHitLanding(window.location.pathname, ref ?? undefined);
  }, []);

  // A client-side navigation never remounts _app, so without this every
  // /features/* and /use-cases/* view after the first one is invisible.
  useEffect(() => {
    const onRouteChange = (url: string) => {
      trackHitLanding(new URL(url, window.location.origin).pathname);
    };
    router.events.on("routeChangeComplete", onRouteChange);
    return () => router.events.off("routeChangeComplete", onRouteChange);
  }, [router.events]);

  return (
    <div className={inter.variable}>
      <MotionConfig reducedMotion="user">
        <DefaultSeo {...defaultSeoConfig} />
        <WebsiteOrganizationJsonLd />
        <Component {...pageProps} />
      </MotionConfig>
    </div>
  );
}

export default App;
