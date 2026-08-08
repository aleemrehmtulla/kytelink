import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { NAV_DESTINATIONS } from "../../consts/nav";
import { NavGlyph } from "./icons";

export function MobileNav() {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // scrollIntoView would scroll the page as well as the strip, so centre the
  // active pill by writing scrollLeft directly.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = activeRef.current;
    if (!scroller || !active) return;
    const target = active.offsetLeft - (scroller.clientWidth - active.clientWidth) / 2;
    scroller.scrollLeft = Math.max(0, target);
  }, [router.pathname]);

  return (
    <div className="border-hairline bg-card border-b md:hidden">
      <nav
        aria-label="Admin sections (mobile)"
        ref={scrollerRef}
        className="edge-fade-x no-scrollbar flex snap-x snap-proximity scroll-px-4 gap-1 overflow-x-auto px-4 py-2"
      >
        {NAV_DESTINATIONS.map((item) => {
          // Leaf pages, not sections: the phone strip has no room for a second
          // level, so sub-pages ride in the same row as everything else.
          const active = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={`rounded-pill flex shrink-0 cursor-pointer snap-start items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium ${
                active ? "bg-accent-soft text-accent" : "text-tertiary"
              }`}
            >
              <NavGlyph
                name={item.glyph}
                className={`shrink-0 ${active ? "text-accent" : "text-faint"}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
