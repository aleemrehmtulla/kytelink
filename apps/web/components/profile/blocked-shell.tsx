import Head from "next/head";
import { SUPPORT_URL } from "../../consts/brand";

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
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-md rounded-card border border-cardline bg-card p-6 text-center shadow-card-rest sm:p-8">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-pill bg-tint text-2xl">
            🚫
          </div>
          <h1 className="text-lg font-semibold tracking-[-0.01em] text-ink">
            This page is suspended
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            It broke the Kytelink rules, so we took it down.
          </p>
          {reason ? (
            <div className="mt-5 rounded-input border border-hairline bg-tint px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-tertiary">
                Reason
              </p>
              <p className="mt-1 text-[13px] leading-relaxed break-words text-secondary">{reason}</p>
            </div>
          ) : null}
          <p className="mt-5 text-sm leading-relaxed text-tertiary">
            Think this is a mistake? Appeals are quick — we fix mistakes fast.
          </p>
          <a
            href={appealHref}
            className="mt-5 inline-flex w-full cursor-pointer items-center justify-center rounded-pill bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground outline-none transition-colors hover:bg-accent-hover"
          >
            Appeal this suspension
          </a>
          <p className="mt-4 text-xs text-faint">
            Still stuck?{" "}
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer text-tertiary underline underline-offset-2 outline-none hover:text-ink"
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
