import type { GetStaticPropsResult } from "next";
import type { DirectoryEntry } from "@kytelink/schemas";
import { KYTELINK_ORIGIN } from "@kytelink/ui/seo";
import { fetchDirectoryPage } from "./api/directory-fetch";

export const DISCOVER_REVALIDATE_SECONDS = 3600;

// Short window for API blips and not-yet-existing pages so they aren't frozen
// behind the hour-long one.
const DISCOVER_MISS_REVALIDATE_SECONDS = 60;

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

export async function discoverPageProps(
  page: number,
): Promise<GetStaticPropsResult<DiscoverPageProps>> {
  if (!Number.isInteger(page) || page < 1) return { notFound: true };

  const result = await fetchDirectoryPage(page);

  // /discover is listed in the sitemap, so an unreachable API must not turn it
  // into a 404 — serve the empty shell and let ISR fill it in shortly.
  if (!result) {
    return page === 1
      ? {
          props: { entries: [], page, pageCount: 1, total: 0 },
          revalidate: DISCOVER_MISS_REVALIDATE_SECONDS,
        }
      : { notFound: true, revalidate: DISCOVER_MISS_REVALIDATE_SECONDS };
  }

  if (page > result.pageCount) {
    return { notFound: true, revalidate: DISCOVER_MISS_REVALIDATE_SECONDS };
  }

  return {
    props: {
      entries: result.entries,
      page,
      pageCount: result.pageCount,
      total: result.total,
    },
    revalidate: DISCOVER_REVALIDATE_SECONDS,
  };
}
