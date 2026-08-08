import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { NAV_DESTINATIONS } from "../../consts/nav";
import { fuzzyFilter } from "../../lib/fuzzy";
import { useAdminSource } from "../../hooks/use-admin-source";
import { useToast } from "../ui/toast";
import type { GlobalSearchResult } from "../../lib/admin-source";
import { leaveForLogin, signOutAdmin } from "../../lib/sign-out";
import {
  rememberDestination,
  readRecentDestinations,
  type RecentDestination,
} from "../../lib/recent-destinations";
import { SearchGlyph } from "./icons";

const RESULT_LIMIT = 15;
const MIN_SEARCH_LENGTH = 2;

const KIND_GROUPS: Record<GlobalSearchResult["kind"], string> = {
  user: "Users",
  org: "Orgs",
  kyte: "Kytes",
};

const KIND_LABELS: Record<GlobalSearchResult["kind"], string> = {
  user: "user",
  org: "org",
  kyte: "kyte",
};

const JUMP_GROUP = "Jump to";
const ACTIONS_GROUP = "Actions";
const RECENT_GROUP = "Recent";

interface PaletteItem {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  keywords?: string;
  badge?: string | null;
  kindLabel?: string;
  href?: string;
  run?: () => void;
  remember?: RecentDestination;
}

export interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const source = useAdminSource();
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent] = useState<RecentDestination[]>(readRecentDestinations);
  const [search, setSearch] = useState<{
    query: string;
    results: GlobalSearchResult[];
    failed: boolean;
  }>({ query: "", results: [], failed: false });
  const [retryToken, setRetryToken] = useState(0);
  const activeRef = useRef<HTMLButtonElement>(null);
  const generationRef = useRef(0);

  const trimmed = query.trim().replace(/^@/, "");
  const searching = trimmed.length >= MIN_SEARCH_LENGTH && search.query !== trimmed;
  const results = useMemo(
    () => (trimmed.length >= MIN_SEARCH_LENGTH ? search.results : []),
    [trimmed, search.results],
  );

  useEffect(() => {
    if (trimmed.length < MIN_SEARCH_LENGTH) return;
    const generation = ++generationRef.current;
    const timer = window.setTimeout(() => {
      source
        .globalSearch({ query: trimmed, limit: RESULT_LIMIT })
        .then((found) => {
          if (generationRef.current !== generation) return;
          setSearch({ query: trimmed, results: found, failed: false });
        })
        .catch(() => {
          if (generationRef.current !== generation) return;
          setSearch({ query: trimmed, results: [], failed: true });
        });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [trimmed, source, retryToken]);

  const navigate = useCallback(
    (href: string) => {
      onClose();
      void router.push(href);
    },
    [router, onClose],
  );

  const logOut = useCallback(async () => {
    onClose();
    try {
      await signOutAdmin();
    } catch {
      toast("Couldn't reach sign-out — clearing this session anyway.", {
        tone: "danger",
      });
    }
    leaveForLogin();
  }, [onClose, toast]);

  const actions = useMemo<PaletteItem[]>(
    () => [
      {
        id: "action:suspend-user",
        group: ACTIONS_GROUP,
        title: "Suspend a user…",
        subtitle: "Find the account, then take it and its orgs down with a reason",
        keywords: "suspend user account org cascade restore status",
        href: "/moderation?case=new",
      },
      {
        id: "action:moderation-case",
        group: ACTIONS_GROUP,
        title: "Open a moderation case…",
        subtitle: "Start a report against a kyte you name",
        keywords: "moderation case report abuse open new flag",
        href: "/moderation/reports?case=new",
      },
      {
        id: "action:export-audit",
        group: ACTIONS_GROUP,
        title: "Export audit log…",
        subtitle: "Copy or download admin activity",
        keywords: "export audit log csv json download copy",
        href: "/audit?export=1",
      },
      {
        id: "action:log-out",
        group: ACTIONS_GROUP,
        title: "Log out",
        subtitle: "End this admin session",
        keywords: "log out sign out logout signout leave",
        run: () => {
          void logOut();
        },
      },
    ],
    [logOut],
  );

  const groups = useMemo(() => {
    const jump: PaletteItem[] = NAV_DESTINATIONS.map((item) => ({
      id: `nav:${item.href}`,
      group: JUMP_GROUP,
      title: item.label,
      subtitle: item.description,
      keywords: item.keywords,
      href: item.href,
    }));

    const keys = (item: PaletteItem) => [
      item.title,
      item.subtitle ?? "",
      item.keywords ?? "",
    ];
    const matchedJump = trimmed ? fuzzyFilter(jump, trimmed, keys) : jump;
    const matchedActions = trimmed ? fuzzyFilter(actions, trimmed, keys) : actions;

    const out: { group: string; items: PaletteItem[] }[] = [];

    if (!trimmed && recent.length > 0) {
      out.push({
        group: RECENT_GROUP,
        items: recent.map((entry) => ({
          id: `recent:${entry.id}`,
          group: RECENT_GROUP,
          title: entry.title,
          subtitle: entry.subtitle,
          badge: entry.badge,
          kindLabel: entry.kindLabel,
          href: entry.href,
          remember: entry,
        })),
      });
    }

    if (matchedJump.length > 0) out.push({ group: JUMP_GROUP, items: matchedJump });

    for (const kind of ["user", "org", "kyte"] as const) {
      const items = results
        .filter((result) => result.kind === kind)
        .map<PaletteItem>((result) => ({
          id: `${result.kind}:${result.id}`,
          group: KIND_GROUPS[kind],
          title: result.label,
          subtitle: result.sublabel,
          badge: result.badge,
          kindLabel: KIND_LABELS[kind],
          href: result.href,
          remember: {
            id: `${result.kind}:${result.id}`,
            title: result.label,
            subtitle: result.sublabel,
            badge: result.badge,
            href: result.href,
            kindLabel: KIND_LABELS[kind],
          },
        }));
      if (items.length > 0) out.push({ group: KIND_GROUPS[kind], items });
    }

    if (matchedActions.length > 0) {
      out.push({ group: ACTIONS_GROUP, items: matchedActions });
    }

    return out;
  }, [trimmed, results, actions, recent]);

  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const positionOf = useMemo(
    () => new Map(flat.map((item, index) => [item.id, index])),
    [flat],
  );
  const active = Math.min(activeIndex, Math.max(0, flat.length - 1));
  const activeItem = flat[active];
  const runHint = activeItem?.group === ACTIONS_GROUP ? "↵ run" : "↵ open";

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const select = useCallback(
    (item: PaletteItem) => {
      if (item.remember) rememberDestination(item.remember);
      if (item.run) {
        item.run();
        return;
      }
      if (item.href) navigate(item.href);
    },
    [navigate],
  );

  function onKeyDown(event: ReactKeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(Math.min(active + 1, flat.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(Math.max(active - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeItem) select(activeItem);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[10vh] sm:p-4 sm:pt-[14vh]">
      <div className="bg-ink/25 absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        onKeyDown={onKeyDown}
        className="rounded-menu border-cardline bg-card shadow-menu relative flex max-h-[76dvh] w-full max-w-xl flex-col overflow-hidden border"
      >
        <div className="border-hairline flex items-center gap-2.5 border-b px-3.5 sm:px-4">
          <SearchGlyph className="text-tertiary shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search or jump to…"
            aria-label="Search users, orgs, kytes, sections and actions"
            className="text-ink placeholder:text-faint h-12 min-w-0 flex-1 bg-transparent text-[14px]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveIndex(0);
              }}
              className="rounded-pill text-faint hover:bg-tint hover:text-secondary cursor-pointer px-2 py-0.5 text-[11px]"
            >
              clear
            </button>
          ) : null}
          <kbd className="border-border bg-tint text-faint hidden rounded-[6px] border px-1.5 py-0.5 font-mono text-[11px] sm:inline">
            esc
          </kbd>
        </div>

        <div
          role="listbox"
          aria-label="Results"
          className="flex-1 overflow-y-auto overscroll-y-none py-1.5"
        >
          {flat.length === 0 ? (
            <PaletteEmpty
              query={trimmed}
              searching={searching}
              failed={search.failed && search.query === trimmed}
              minLength={MIN_SEARCH_LENGTH}
              onRetry={() => {
                setSearch({ query: "", results: [], failed: false });
                setRetryToken((token) => token + 1);
              }}
              onClear={() => {
                setQuery("");
                setActiveIndex(0);
              }}
            />
          ) : (
            <>
              {searching ? (
                <p className="text-faint px-4 pt-2 pb-1 text-[11px]">
                  Searching users, orgs and kytes for “{trimmed}”…
                </p>
              ) : null}
              {groups.map((group) => (
                <div
                  key={group.group}
                  role="group"
                  aria-label={group.group}
                  className="px-2 pb-1"
                >
                  <div className="text-faint px-2 pt-2 pb-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
                    {group.group}
                  </div>
                  {group.items.map((item) => {
                    const index = positionOf.get(item.id) ?? -1;
                    const isActive = index === active;
                    return (
                      <button
                        key={item.id}
                        ref={isActive ? activeRef : undefined}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => select(item)}
                        onMouseMove={() => setActiveIndex(index)}
                        className={`rounded-input flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left ${
                          isActive ? "bg-tint" : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="text-ink block truncate text-[13.5px]">
                            {item.title}
                          </span>
                          {item.subtitle ? (
                            <span className="text-tertiary block truncate text-[12px]">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>
                        {item.badge ? (
                          <span className="rounded-pill bg-accent-soft text-accent shrink-0 px-2 py-0.5 text-[11px] font-medium">
                            {item.badge}
                          </span>
                        ) : null}
                        {item.kindLabel ? (
                          <span className="rounded-pill bg-tint text-tertiary hidden shrink-0 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase sm:inline">
                            {item.kindLabel}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="border-hairline text-faint hidden items-center gap-4 border-t px-4 py-2 text-[11px] sm:flex">
          <span>↑↓ navigate</span>
          <span>{runHint}</span>
          <span>esc close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PaletteEmpty({
  query,
  searching,
  failed,
  minLength,
  onRetry,
  onClear,
}: {
  query: string;
  searching: boolean;
  failed: boolean;
  minLength: number;
  onRetry: () => void;
  onClear: () => void;
}) {
  if (failed && !searching) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-secondary text-[13px]">Search couldn&rsquo;t reach the API.</p>
        <p className="text-faint mt-1 text-[12px]">
          Nothing is wrong with your query — the request failed.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-pill border-border text-secondary hover:bg-tint mt-3 cursor-pointer border px-3 py-1.5 text-[12px] font-medium"
        >
          Search again
        </button>
      </div>
    );
  }

  if (searching) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-secondary text-[13px]">Searching for “{query}”…</p>
        <p className="text-faint mt-1 text-[12px]">Users, orgs and kytes.</p>
      </div>
    );
  }

  if (query.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-secondary text-[13px]">
          Type to search users, orgs and kytes.
        </p>
        <p className="text-faint mt-1 text-[12px]">
          An email, an @username, or an org name — partial matches are fine.
        </p>
      </div>
    );
  }

  if (query.length < minLength) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-secondary text-[13px]">Keep typing…</p>
        <p className="text-faint mt-1 text-[12px]">
          Searching starts at {minLength} characters.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 text-center">
      <p className="text-secondary text-[13px]">No results for “{query}”.</p>
      <p className="text-faint mt-1 text-[12px]">
        Suspended accounts are included, so try a shorter fragment.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="rounded-pill border-border text-secondary hover:bg-tint mt-3 cursor-pointer border px-3 py-1.5 text-[12px] font-medium"
      >
        Clear search
      </button>
    </div>
  );
}
