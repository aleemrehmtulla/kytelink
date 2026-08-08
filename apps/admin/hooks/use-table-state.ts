import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

export type SortDir = "asc" | "desc";

export interface UseTableStateOptions {
  /** Namespaces the URL keys so two tables on one page don't collide: "members" → membersPage. */
  keyPrefix?: string;
}

export interface UseTableStateResult<TSort extends string> {
  page: number;
  pageSize: number;
  sort: TSort;
  dir: SortDir;
  filters: Record<string, string>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSort: (key: TSort, dir: SortDir) => void;
  setFilter: (key: string, value: string) => void;
  setFilters: (patch: Record<string, string>) => void;
  clearFilters: () => void;
  resetPage: () => void;
}

interface TableState<TSort extends string> {
  page: number;
  pageSize: number;
  sort: TSort;
  dir: SortDir;
  filters: Record<string, string>;
}

type Query = Record<string, string | string[] | undefined>;

const URL_WRITE_DEBOUNCE_MS = 150;

function urlKey(prefix: string, base: string): string {
  if (prefix.length === 0) return base;
  return `${prefix}${base.charAt(0).toUpperCase()}${base.slice(1)}`;
}

function readParam(query: Query, key: string): string | undefined {
  const raw = query[key];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function readPositiveInt(query: Query, key: string): number | undefined {
  const raw = readParam(query, key);
  if (raw === undefined) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return parsed;
}

function sameQuery(a: Query, b: Query): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    if (Array.isArray(left) || Array.isArray(right)) {
      if (JSON.stringify(left) !== JSON.stringify(right)) return false;
      continue;
    }
    if (left !== right) return false;
  }
  return true;
}

interface PendingWrites {
  pathname: string;
  values: Map<string, string | null>;
}

let pendingWrites: PendingWrites | null = null;

function recordPending(pathname: string, key: string, value: string | null) {
  if (!pendingWrites || pendingWrites.pathname !== pathname) {
    pendingWrites = { pathname, values: new Map() };
  }
  pendingWrites.values.set(key, value);
}

/**
 * Two prefixed tables on one page both replace() against the same query object, and
 * replace() is async — the second writer can read a router.query that hasn't caught
 * up with the first. Re-apply every key a sibling wrote (never our own) so neither
 * table drops the other's state, dropping entries once the router agrees.
 */
function applyPendingWrites(
  pathname: string,
  live: Query,
  target: Query,
  owned: Set<string>,
) {
  const pending = pendingWrites;
  if (!pending || pending.pathname !== pathname) return;
  for (const [key, value] of [...pending.values]) {
    if (owned.has(key)) continue;
    const current = readParam(live, key);
    const settled = value === null ? current === undefined : current === value;
    if (settled) {
      pending.values.delete(key);
      continue;
    }
    if (value === null) delete target[key];
    else target[key] = value;
  }
}

/**
 * URL is the hydration source; a local override takes over the moment the admin
 * touches a control so typing stays responsive while writes are debounced. Always
 * `replace`, never `push` — filter tweaks must not become history entries.
 */
export function useTableState<TSort extends string>(
  defaults: { sort: TSort; dir: SortDir; pageSize?: number },
  filterDefaults: Record<string, string> = {},
  options: UseTableStateOptions = {},
): UseTableStateResult<TSort> {
  const router = useRouter();
  // Deltas, not a full snapshot: every setter can compose off `previous` alone,
  // so none of them needs to read current state and they all stay referentially
  // stable. Merging deltas over the URL-derived state each render keeps
  // hydration working without a set-state-in-effect round trip.
  const [override, setOverride] = useState<Partial<TableState<TSort>> | null>(null);

  const defaultPageSize = defaults.pageSize ?? 25;
  const defaultSort = defaults.sort;
  const defaultDir = defaults.dir;
  const filterDefaultsKey = JSON.stringify(filterDefaults);
  const prefix = options.keyPrefix ?? "";

  const query = router.query as Query;
  const urlDir = readParam(query, urlKey(prefix, "dir"));
  const fromUrl: TableState<TSort> = {
    page: readPositiveInt(query, urlKey(prefix, "page")) ?? 1,
    pageSize: readPositiveInt(query, urlKey(prefix, "pageSize")) ?? defaultPageSize,
    sort: (readParam(query, urlKey(prefix, "sort")) as TSort | undefined) ?? defaultSort,
    dir: urlDir === "asc" || urlDir === "desc" ? urlDir : defaultDir,
    filters: Object.fromEntries(
      Object.entries(filterDefaults).map(([key, fallback]) => [
        key,
        readParam(query, urlKey(prefix, key)) ?? fallback,
      ]),
    ),
  };

  const page = override?.page ?? fromUrl.page;
  const pageSize = override?.pageSize ?? fromUrl.pageSize;
  const sort = override?.sort ?? fromUrl.sort;
  const dir = override?.dir ?? fromUrl.dir;
  const filters = { ...fromUrl.filters, ...override?.filters };
  const filtersKey = JSON.stringify(filters);

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });

  // No useCallback: the React Compiler memoizes these, and because every setter
  // composes purely off `previous` it has everything it needs to keep their
  // identities stable.
  const setPage = (next: number) => {
    setOverride((previous) => ({ ...previous, page: Math.max(1, Math.trunc(next)) }));
  };

  const setPageSize = (next: number) => {
    setOverride((previous) => ({
      ...previous,
      pageSize: Math.max(1, Math.trunc(next)),
      page: 1,
    }));
  };

  const setSort = (key: TSort, nextDir: SortDir) => {
    setOverride((previous) => ({ ...previous, sort: key, dir: nextDir, page: 1 }));
  };

  const resetPage = () => {
    setOverride((previous) => ({ ...previous, page: 1 }));
  };

  // Accumulates into the filter delta so several keys set in one handler all
  // land, instead of the last write winning.
  const setFilters = (patch: Record<string, string>) => {
    setOverride((previous) => ({
      ...previous,
      page: 1,
      filters: { ...previous?.filters, ...patch },
    }));
  };

  const setFilter = (key: string, value: string) => setFilters({ [key]: value });

  // Writes every default explicitly rather than clearing the delta, so the
  // defaults win over whatever the URL still carries.
  const clearFilters = () => {
    const resetTo = JSON.parse(filterDefaultsKey) as Record<string, string>;
    setOverride((previous) => ({ ...previous, page: 1, filters: resetTo }));
  };

  const routerReady = router.isReady;

  useEffect(() => {
    if (!routerReady) return;
    const timer = setTimeout(() => {
      const activeRouter = routerRef.current;
      const parsedDefaults = JSON.parse(filterDefaultsKey) as Record<string, string>;
      const parsedFilters = JSON.parse(filtersKey) as Record<string, string>;
      const currentQuery = activeRouter.query as Query;
      const pathname = activeRouter.pathname;
      const next: Query = { ...currentQuery };

      const owned = new Set<string>([
        urlKey(prefix, "page"),
        urlKey(prefix, "pageSize"),
        urlKey(prefix, "sort"),
        urlKey(prefix, "dir"),
        ...Object.keys(parsedDefaults).map((key) => urlKey(prefix, key)),
      ]);
      applyPendingWrites(pathname, currentQuery, next, owned);

      const assign = (base: string, value: string | null) => {
        const key = urlKey(prefix, base);
        if (value === null) delete next[key];
        else next[key] = value;
        recordPending(pathname, key, value);
      };

      assign("page", page === 1 ? null : String(page));
      assign("pageSize", pageSize === defaultPageSize ? null : String(pageSize));
      assign("sort", sort === defaultSort ? null : sort);
      assign("dir", dir === defaultDir ? null : dir);
      for (const [key, value] of Object.entries(parsedFilters)) {
        assign(key, value === (parsedDefaults[key] ?? "") ? null : value);
      }

      if (sameQuery(next, currentQuery)) return;
      void activeRouter.replace({ pathname, query: next }, undefined, { shallow: true });
    }, URL_WRITE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    routerReady,
    prefix,
    page,
    pageSize,
    sort,
    dir,
    filtersKey,
    filterDefaultsKey,
    defaultPageSize,
    defaultSort,
    defaultDir,
  ]);

  return {
    page,
    pageSize,
    sort,
    dir,
    filters,
    setPage,
    setPageSize,
    setSort,
    setFilter,
    setFilters,
    clearFilters,
    resetPage,
  };
}
