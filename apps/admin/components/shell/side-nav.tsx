import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useSyncExternalStore } from "react";
import { NAV_GROUPS, isNavChildActive, isNavItemActive } from "../../consts/nav";
import { NavGlyph, SidebarGlyph } from "./icons";

// Mirrored by the pre-paint script in pages/_document.tsx.
const COLLAPSED_KEY = "kytelink.admin.nav-collapsed";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readCollapsed(): boolean {
  return document.documentElement.dataset.nav === "collapsed";
}

function readCollapsedOnServer(): boolean {
  return false;
}

export function SideNav() {
  const router = useRouter();
  // The rail's width and labels come from the data-nav attribute in CSS, set
  // before first paint. This subscription only feeds the toggle's own
  // aria-label — nothing here can move the layout.
  const collapsed = useSyncExternalStore(
    subscribe,
    readCollapsed,
    readCollapsedOnServer,
  );

  const toggle = useCallback(() => {
    const next = !readCollapsed();
    if (next) document.documentElement.dataset.nav = "collapsed";
    else delete document.documentElement.dataset.nav;
    try {
      window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // A blocked storage write only costs persistence, not the toggle.
    }
    for (const listener of listeners) listener();
  }, []);

  return (
    <nav
      aria-label="Admin sections"
      className="side-nav border-hairline bg-card hidden h-full shrink-0 flex-col overflow-y-auto overscroll-y-none border-r py-5 md:flex"
    >
      <div className="side-nav-row mb-8 flex items-center gap-2 px-2.5">
        <Link
          href="/overview"
          className="flex cursor-pointer items-center"
          aria-label="Kytelink admin"
        >
          <span className="text-[20px] leading-none" aria-hidden="true">
            🪁
          </span>
        </Link>
        <span className="side-nav-label text-tertiary text-[11px] font-semibold tracking-[0.1em] uppercase">
          Admin
        </span>
      </div>

      <div className="flex flex-col gap-8">
        {NAV_GROUPS.map((group) => (
          <div key={group.section} className="flex flex-col gap-1">
            <div className="side-nav-label text-faint mb-1 px-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
              {group.section}
            </div>
            <div
              className="side-nav-when-collapsed bg-hairline mx-auto mb-2 h-px w-6"
              aria-hidden="true"
            />
            {group.items.map((item) => {
              const active = isNavItemActive(router.pathname, item.href);
              return (
                <div key={item.href} className="flex flex-col gap-0.5">
                  <Link
                    href={item.href}
                    aria-current={active && !item.children ? "page" : undefined}
                    title={item.label}
                    className={`side-nav-row rounded-input flex cursor-pointer items-center gap-2.5 px-2.5 py-2 text-[13.5px] font-medium ${
                      active
                        ? "text-accent bg-accent-soft"
                        : "text-secondary hover:bg-tint hover:text-ink"
                    }`}
                  >
                    <NavGlyph
                      name={item.glyph}
                      className={`shrink-0 ${active ? "text-accent" : "text-faint"}`}
                    />
                    <span className="side-nav-label truncate">{item.label}</span>
                    <span className="side-nav-when-collapsed sr-only">{item.label}</span>
                  </Link>

                  {/* Sub-pages only exist while their section is open — the rail
                      stays short, and the collapsed rail never shows them. */}
                  {item.children && active ? (
                    <div className="side-nav-label border-hairline mt-0.5 mb-1 ml-[15px] flex flex-col gap-0.5 border-l pl-3">
                      {item.children.map((child) => {
                        const here = isNavChildActive(router.pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={here ? "page" : undefined}
                            className={`rounded-input cursor-pointer px-2 py-1.5 text-[13px] ${
                              here
                                ? "text-ink font-medium"
                                : "text-tertiary hover:bg-tint hover:text-ink"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={collapsed}
        className="side-nav-row rounded-input text-faint hover:bg-tint hover:text-secondary mt-auto flex cursor-pointer items-center gap-2.5 px-2.5 pt-8 pb-1 text-[12px] font-medium"
      >
        <SidebarGlyph className="shrink-0" />
        <span className="side-nav-label">Collapse</span>
      </button>
    </nav>
  );
}
