import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

interface NavMenuItem {
  label: string;
  href: string;
  description?: string;
}

export interface NavMenuDef {
  id: string;
  label: string;
  items: NavMenuItem[];
}

export interface NavLinkDef {
  id: string;
  label: string;
  href: string;
}

const CLOSE_DELAY_MS = 120;
const SPRING = { type: "spring", stiffness: 480, damping: 36, mass: 0.7 } as const;

export function PrimaryNav({ menus, links }: { menus: NavMenuDef[]; links: NavLinkDef[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = menus.find((menu) => menu.id === activeId) ?? null;

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMenu(id: string) {
    cancelClose();
    setActiveId(id);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setActiveId(null), CLOSE_DELAY_MS);
  }

  function close() {
    cancelClose();
    setActiveId(null);
  }

  useEffect(() => cancelClose, []);

  useLayoutEffect(() => {
    if (!activeId) return;
    const el = triggerRefs.current.get(activeId);
    if (el) setLeft(el.offsetLeft);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;

    function dismiss() {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setActiveId(null);
    }
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) dismiss();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeId]);

  function onBlurCapture(event: FocusEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const next = event.relatedTarget as Node | null;
    if (next && containerRef.current.contains(next)) return;
    close();
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={containerRef}
        className="relative flex items-center gap-1"
        onMouseLeave={scheduleClose}
        onBlurCapture={onBlurCapture}
      >
        {menus.map((menu) => {
          const open = activeId === menu.id;
          return (
            <button
              key={menu.id}
              ref={(el) => {
                if (el) triggerRefs.current.set(menu.id, el);
                else triggerRefs.current.delete(menu.id);
              }}
              type="button"
              onMouseEnter={() => openMenu(menu.id)}
              onFocus={() => openMenu(menu.id)}
              onClick={() => (open ? close() : openMenu(menu.id))}
              aria-expanded={open}
              aria-haspopup="menu"
              className={`flex cursor-pointer items-center gap-1 rounded-input px-3 py-2 text-sm font-medium outline-none transition-colors ${
                open ? "text-ink" : "text-secondary hover:text-ink"
              }`}
            >
              {menu.label}
              <svg
                viewBox="0 0 12 12"
                width="10"
                height="10"
                aria-hidden="true"
                className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              >
                <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          );
        })}

        {links.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            onMouseEnter={close}
            className="cursor-pointer rounded-input px-3 py-2 text-sm font-medium text-secondary outline-none transition-colors hover:text-ink"
          >
            {link.label}
          </Link>
        ))}

        <AnimatePresence>
          {active ? (
            <motion.div
              key="nav-panel"
              className="absolute top-full z-30 pt-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, left }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ ...SPRING, opacity: { duration: 0.14 } }}
              onMouseEnter={cancelClose}
            >
              <motion.div
                layout
                transition={SPRING}
                role="menu"
                className="w-64 overflow-hidden rounded-menu border border-cardline bg-white p-1.5 shadow-menu"
              >
                {active.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={close}
                    className="block cursor-pointer rounded-input px-2.5 py-2 outline-none transition-colors hover:bg-tint"
                  >
                    <span className="block text-sm font-medium text-ink">{item.label}</span>
                    {item.description ? (
                      <span className="mt-0.5 block text-xs text-tertiary">{item.description}</span>
                    ) : null}
                  </Link>
                ))}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
