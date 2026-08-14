import Head from "next/head";
import Link from "next/link";
import { LANDING_ORIGIN } from "../../consts/landing-routes";
import { discoverCanonical, discoverHref, type DiscoverPageProps } from "../../lib/discover";
import { Button } from "../ui/button";

function title(page: number): string {
  return page === 1 ? "Discover creators | Kytelink" : `Discover creators — Page ${page} | Kytelink`;
}

function description(page: number, pageCount: number): string {
  const base = "Browse every public page on Kytelink — creators, makers and brands with a kyte.";
  return page === 1 ? base : `${base} Page ${page} of ${pageCount}.`;
}

export function DirectoryView({ entries, page, pageCount, total }: DiscoverPageProps) {
  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page < pageCount ? page + 1 : null;

  return (
    <>
      <Head>
        <title>{title(page)}</title>
        <meta name="description" content={description(page, pageCount)} />
        <link rel="canonical" href={discoverCanonical(page)} />
        {previousPage ? <link rel="prev" href={discoverCanonical(previousPage)} /> : null}
        {nextPage ? <link rel="next" href={discoverCanonical(nextPage)} /> : null}
      </Head>
      <main className="mx-auto w-full max-w-2xl px-6 py-14 sm:px-8">
        <a href={LANDING_ORIGIN} className="inline-flex items-center" aria-label="Kytelink">
          <span className="text-3xl">🪁</span>
        </a>
        <h1 className="text-ink mt-8 text-[28px] font-bold tracking-[-0.025em]">
          Discover creators
        </h1>
        <p className="text-secondary mt-1.5 text-sm leading-relaxed">
          {total > 0
            ? `Every public page on Kytelink — ${total.toLocaleString("en-US")} and counting.`
            : "Every public page on Kytelink, in one place."}
        </p>

        {entries.length > 0 ? (
          <ul className="border-cardline rounded-card mt-8 overflow-hidden border">
            {entries.map((entry) => (
              <li key={entry.username} className="border-hairline border-b last:border-b-0">
                <Link
                  href={`/${entry.username}`}
                  className="hover:bg-tint flex cursor-pointer items-baseline justify-between gap-4 px-4 py-3 transition-colors"
                >
                  <span className="text-ink truncate text-sm font-medium">
                    {entry.displayName ?? entry.username}
                  </span>
                  <span className="text-faint shrink-0 text-[13px]">@{entry.username}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-tertiary border-cardline rounded-card mt-8 border px-4 py-8 text-center text-sm">
            No public pages yet.
          </p>
        )}

        <nav aria-label="Directory pages" className="mt-8 flex items-center justify-between gap-4">
          {previousPage ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={discoverHref(previousPage)} rel="prev">
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-tertiary text-[13px]">
            Page {page} of {pageCount}
          </span>
          {nextPage ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={discoverHref(nextPage)} rel="next">
                Next
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>

        {page > 1 ? (
          <p className="mt-6 text-center text-[13px]">
            <Link
              href="/discover"
              className="text-tertiary hover:text-ink cursor-pointer underline underline-offset-2 transition-colors"
            >
              Back to the first page
            </Link>
          </p>
        ) : null}
      </main>
    </>
  );
}
