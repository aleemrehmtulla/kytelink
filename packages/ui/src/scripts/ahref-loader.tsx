import type { ReactElement } from "react";
import Script from "next/script";

const AHREFS_KEY = process.env.NEXT_PUBLIC_AHREFS_KEY;

export function AhrefLoader(): ReactElement | null {
  if (!AHREFS_KEY) return null;
  return (
    <Script
      strategy="afterInteractive"
      src="https://analytics.ahrefs.com/analytics.js"
      data-key={AHREFS_KEY}
    />
  );
}
