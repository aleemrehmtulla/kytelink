import type { GetStaticPropsResult } from "next";
import type { DirectoryEntry, DirectoryPage } from "@kytelink/schemas";
import { KYTELINK_ORIGIN } from "@kytelink/ui";
import { serverApiOrigin } from "./env";

const TIMEOUT_MS = 5000;
const HIT_REVALIDATE_SECONDS = 3600;

// Short window for API blips and not-yet-existing pages so they aren't frozen
// behind the hour-long one.
const MISS_REVALIDATE_SECONDS = 60;

export interface DiscoverPageProps {
  entries: DirectoryEntry[];
  page: number;
  pageCount: number;
  total: number;
}

export function discoverHref(page: number): string {
  return page <= 1 ? "/discover" : `/discover/${page}`;
}

export function discoverCanonical(page: number): string {
  return `${KYTELINK_ORIGIN}${discoverHref(page)}`;
}

// Returns null when the API is unreachable rather than throwing: /discover is
// prerendered at build time, so a throw here would fail the whole landing build
// on a deploy that starts before the API is reachable.
async function fetchDirectoryPage(page: number): Promise<DirectoryPage | null> {
  try {
    const response = await fetch(`${serverApiOrigin()}/directory/${page}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as DirectoryPage;
  } catch {
    return null;
  }
}

export async function discoverPageProps(
  page: number,
): Promise<GetStaticPropsResult<DiscoverPageProps>> {
  if (!Number.isSafeInteger(page) || page < 1) return { notFound: true };

  const result = await fetchDirectoryPage(page);

  // /discover is listed in the sitemap, so an unreachable API must not turn it
  // into a 404 — serve the empty shell and let ISR fill it in shortly.
  if (!result) {
    return page === 1
      ? {
          props: { entries: [], page, pageCount: 1, total: 0 },
          revalidate: MISS_REVALIDATE_SECONDS,
        }
      : { notFound: true, revalidate: MISS_REVALIDATE_SECONDS };
  }

  if (page > result.pageCount) {
    return { notFound: true, revalidate: MISS_REVALIDATE_SECONDS };
  }

  return {
    props: {
      entries: result.entries,
      page,
      pageCount: result.pageCount,
      total: result.total,
    },
    revalidate: HIT_REVALIDATE_SECONDS,
  };
}
