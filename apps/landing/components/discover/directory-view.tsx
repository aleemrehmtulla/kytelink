import Link from "next/link";
import { NextSeo } from "next-seo";
import { PageShell } from "../layout/page-shell";
import { Container } from "../ui/container";
import { ButtonLink } from "../ui/button-link";
import { ProfileCard } from "./profile-card";
import {
  discoverCanonical,
  discoverHref,
  type DiscoverPageProps,
} from "../../lib/discover";
import { buildPageSeo } from "../../lib/seo/build-page-seo";

const EAGER_AVATARS = 4;

function titleFor(page: number): string {
  return page === 1 ? "Discover kytes" : `Discover kytes — Page ${page}`;
}

function descriptionFor(page: number, pageCount: number): string {
  const base =
    "Browse every public page on Kytelink — the people, businesses, musicians, agencies and " +
    "communities who have claimed a kyte.";
  return page === 1 ? base : `${base} Page ${page} of ${pageCount}.`;
}

export function DirectoryView({ entries, page, pageCount, total }: DiscoverPageProps) {
  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page < pageCount ? page + 1 : null;

  const seo = buildPageSeo({
    path: discoverHref(page),
    title: titleFor(page),
    description: descriptionFor(page, pageCount),
  });

  return (
    <>
      <NextSeo
        {...seo}
        additionalLinkTags={[
          ...(previousPage
            ? [{ rel: "prev", href: discoverCanonical(previousPage) }]
            : []),
          ...(nextPage ? [{ rel: "next", href: discoverCanonical(nextPage) }] : []),
        ]}
      />
      <PageShell>
        <Container className="flex flex-col items-center pt-16 pb-6 text-center sm:pt-24 sm:pb-8">
          <h1 className="text-ink max-w-3xl text-[40px] leading-[1.05] font-bold tracking-[-0.03em] text-balance sm:text-[56px]">
            Discover kytes
          </h1>
          <p className="text-secondary mt-6 max-w-xl text-lg leading-relaxed text-pretty">
            {total > 0
              ? `Every public page on Kytelink — ${total.toLocaleString("en-US")} kytes and counting.`
              : "Every public page on Kytelink, in one place."}
          </p>
        </Container>

        <Container className="pb-20 sm:pb-28">
          {entries.length > 0 ? (
            <ul className="mx-auto grid w-full max-w-[1100px] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {entries.map((entry, index) => (
                <li key={entry.username}>
                  <ProfileCard entry={entry} eager={index < EAGER_AVATARS} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-hairline bg-canvas mx-auto max-w-[1100px] rounded-[18px] border px-6 py-16 text-center">
              <p className="text-ink text-[15px] font-semibold">Nothing to browse yet.</p>
              <p className="text-secondary mt-2 text-[13px]">
                Published pages show up here automatically.
              </p>
            </div>
          )}

          <nav
            aria-label="Directory pages"
            className="mx-auto mt-12 flex w-full max-w-[1100px] items-center justify-between gap-4"
          >
            {previousPage ? (
              <ButtonLink href={discoverHref(previousPage)} variant="outline" rel="prev">
                Previous
              </ButtonLink>
            ) : (
              <span aria-hidden="true" />
            )}
            <span className="text-tertiary text-[13px]">
              Page {page} of {pageCount.toLocaleString("en-US")}
            </span>
            {nextPage ? (
              <ButtonLink href={discoverHref(nextPage)} variant="outline" rel="next">
                Next
              </ButtonLink>
            ) : (
              <span aria-hidden="true" />
            )}
          </nav>

          {page > 1 ? (
            <p className="mt-6 text-center text-[13px]">
              <Link
                href={discoverHref(1)}
                className="text-tertiary hover:text-ink cursor-pointer underline underline-offset-2 transition-colors outline-none"
              >
                Back to the first page
              </Link>
            </p>
          ) : null}
        </Container>
      </PageShell>
    </>
  );
}
