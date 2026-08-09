import Head from "next/head";
import { SUPPORT_URL } from "../../consts/brand";
import { LANDING_ORIGIN } from "../../consts/landing-routes";
import { Button } from "../ui/button";

export interface BlockedShellProps {
  reason: string | null;
  // Built in getStaticProps: the public profile route has a client-bundle
  // budget, and the URL helper reaches for the @kytelink/schemas barrel.
  appealHref: string;
}

export function BlockedShell({ reason, appealHref }: BlockedShellProps) {
  return (
    <>
      <Head>
        <title>Page suspended | Kytelink</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <a href={LANDING_ORIGIN} className="mb-8 inline-flex items-center" aria-label="Kytelink">
            <span className="text-3xl">🪁</span>
          </a>
          <h1 className="text-[28px] font-bold tracking-[-0.025em] text-ink">
            This page is suspended
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-secondary">
            It broke the Kytelink rules, so we took it down.
          </p>
          {reason ? (
            <div className="mt-6 rounded-input border border-hairline bg-tint px-4 py-3">
              <p className="text-[11px] font-semibold tracking-[0.06em] text-tertiary uppercase">
                Reason
              </p>
              <p className="mt-1 text-[13px] leading-relaxed break-words text-secondary">{reason}</p>
            </div>
          ) : null}
          <p className="mt-6 text-sm leading-relaxed text-secondary">
            Think this is a mistake? Appeals are quick — we fix mistakes fast.
          </p>
          <Button asChild variant="accent" block className="mt-4">
            <a href={appealHref}>Appeal this suspension</a>
          </Button>
          <p className="mt-8 text-xs text-faint">
            Still stuck?{" "}
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noreferrer"
              className="text-tertiary underline underline-offset-2 hover:text-ink"
            >
              Contact support
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
}
