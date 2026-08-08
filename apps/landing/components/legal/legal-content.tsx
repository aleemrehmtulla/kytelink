import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { linkify } from "../../lib/legal/linkify";
import type { LegalDocument } from "../../lib/legal/types";

const SCROLL_OFFSET = 120;

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function LegalContent({
  document: doc,
  slots,
}: {
  document: LegalDocument;
  slots?: Record<string, ReactNode>;
}) {
  const slugs = useMemo(() => doc.sections.map((section) => slugify(section.heading)), [doc]);
  const rootRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [activeId, setActiveId] = useState<string | null>(slugs[0] ?? null);
  const [rail, setRail] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    if (slugs.length === 0) return;

    let rafId = 0;
    let ticking = false;

    const compute = () => {
      const root = rootRef.current;
      if (root) {
        let current: string | null = slugs[0] ?? null;
        for (const slug of slugs) {
          const el = root.querySelector<HTMLElement>(`[data-legal-slug="${slug}"]`);
          if (!el) continue;
          if (el.getBoundingClientRect().top - SCROLL_OFFSET <= 0) current = slug;
          else break;
        }
        // Short final sections can never reach the header line, so pin the
        // last entry once the page is scrolled to the bottom.
        const atBottom =
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (atBottom) current = slugs[slugs.length - 1] ?? current;
        setActiveId(current);

        let first = -1;
        let last = -1;
        slugs.forEach((slug, i) => {
          const el = root.querySelector<HTMLElement>(`[data-legal-slug="${slug}"]`);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          if (rect.bottom > SCROLL_OFFSET && rect.top < window.innerHeight) {
            if (first === -1) first = i;
            last = i;
          }
        });
        if (first === -1) {
          first = Math.max(current ? slugs.indexOf(current) : 0, 0);
          last = first;
        }

        const firstLink = linkRefs.current[first];
        const lastLink = linkRefs.current[last];
        if (firstLink && lastLink) {
          setRail({
            top: firstLink.offsetTop,
            height: Math.max(lastLink.offsetTop + lastLink.offsetHeight - firstLink.offsetTop, 0),
          });
        }
      }
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [slugs]);

  return (
    <div ref={rootRef}>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-tertiary">
        <Link href="/" className="cursor-pointer outline-none transition-colors hover:text-accent">
          Home
        </Link>
        <ChevronRight className="size-3" strokeWidth={2.5} aria-hidden="true" />
        <Link href="/legal" className="cursor-pointer outline-none transition-colors hover:text-accent">
          Legal
        </Link>
        <ChevronRight className="size-3" strokeWidth={2.5} aria-hidden="true" />
        <span className="font-medium text-ink">{doc.title}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{doc.title}</h1>
      <p className="mt-3 text-sm text-tertiary">Last updated {doc.lastUpdated}</p>

      <div className="mt-12 grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16">
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-tertiary">On this page</p>
            <div className="relative flex flex-col">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
              {rail ? (
                <motion.span
                  aria-hidden="true"
                  className="absolute left-0 w-[2px] rounded-pill bg-accent"
                  initial={false}
                  animate={{ top: rail.top, height: rail.height }}
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                />
              ) : null}
              {doc.sections.map((section, i) => {
                const slug = slugs[i];
                const active = slug === activeId;
                return (
                  <a
                    key={slug}
                    ref={(node) => {
                      linkRefs.current[i] = node;
                    }}
                    href={`#${slug}`}
                    aria-current={active ? "true" : undefined}
                    className={`cursor-pointer py-2 pl-4 pr-2 text-sm leading-snug outline-none transition-colors ${
                      active ? "text-accent" : "text-secondary hover:text-accent"
                    }`}
                  >
                    {section.heading}
                  </a>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="min-w-0 max-w-2xl">
          <p className="text-lg text-secondary">{linkify(doc.intro)}</p>

          <div className="mt-4 flex flex-col">
            {doc.sections.map((section, i) => {
              const slug = slugs[i];
              return (
                <section
                  key={slug}
                  id={slug}
                  data-legal-slug={slug}
                  className="scroll-mt-24 border-b border-hairline py-8 last:border-b-0 last:pb-0"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-tertiary">
                    Section {String(i + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                    {section.heading}
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-base leading-relaxed text-secondary">
                        {linkify(paragraph)}
                      </p>
                    ))}
                  </div>
                  {section.bullets ? (
                    <ul className="mt-4 flex flex-col gap-2.5">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="relative pl-5 text-base leading-relaxed text-secondary before:absolute before:left-0 before:top-[0.65em] before:size-1.5 before:rounded-pill before:bg-accent-border"
                        >
                          {linkify(bullet)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {section.slot && slots?.[section.slot] ? (
                    <div className="mt-6">{slots[section.slot]}</div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
