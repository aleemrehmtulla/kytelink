import type { DirectoryPage } from "@kytelink/schemas";
import { isMockApi } from "./client";
import { signedInternalGet } from "./internal-hmac";

const EMPTY: DirectoryPage = { entries: [], page: 1, pageSize: 100, total: 0, pageCount: 1 };

const TIMEOUT_MS = 5000;

// Returns null when the API is unreachable rather than throwing: /discover is a
// build-time static page, so a throw here would fail the whole web build on a
// deploy that starts before the API is reachable.
export async function fetchDirectoryPage(page: number): Promise<DirectoryPage | null> {
  if (isMockApi()) return { ...EMPTY, page };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await signedInternalGet(`/internal/directory/${page}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    return (await response.json()) as DirectoryPage;
  } catch {
    return null;
  }
}
