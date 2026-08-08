import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Portal } from "./portal";

export interface DropdownItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
  hint?: string;
}

export interface DropdownSeparator {
  key: string;
  separator: true;
}

export interface DropdownSectionLabel {
  key: string;
  sectionLabel: string;
}

export type DropdownEntry = DropdownItem | DropdownSeparator | DropdownSectionLabel;

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownEntry[];
  align?: "start" | "end";
  label: string;
}

interface MenuPosition {
  top: number;
  left: number;
  minWidth: number;
}

function isSeparator(entry: DropdownEntry): entry is DropdownSeparator {
  return "separator" in entry;
}

function isSectionLabel(entry: DropdownEntry): entry is DropdownSectionLabel {
  return "sectionLabel" in entry;
}

function isSelectable(entry: DropdownEntry): entry is DropdownItem {
  return !isSeparator(entry) && !isSectionLabel(entry) && !entry.disabled;
}

const MENU_WIDTH = 224;
const MENU_GAP = 6;

export function Dropdown({ trigger, items, align = "end", label }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  const selectable = items.filter(isSelectable);

  const measure = useCallback((): MenuPosition | null => {
    const node = triggerRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const width = Math.max(MENU_WIDTH, rect.width);
    const rawLeft = align === "end" ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(8, rawLeft),
      Math.max(8, window.innerWidth - width - 8),
    );
    return { top: rect.bottom + MENU_GAP, left, minWidth: width };
  }, [align]);

  const close = useCallback(() => {
    setOpen(false);
    setPosition(null);
    setActiveKey(null);
    triggerRef.current?.focus();
  }, []);

  function openMenu(focusFirst: boolean) {
    setPosition(measure());
    setOpen(true);
    setActiveKey(focusFirst ? (selectable[0]?.key ?? null) : null);
  }

  useEffect(() => {
    if (!open) return;
    function reposition() {
      const next = measure();
      if (next) setPosition(next);
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
      setPosition(null);
      setActiveKey(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || activeKey === null) return;
    itemRefs.current.get(activeKey)?.focus();
  }, [open, activeKey]);

  function move(delta: number) {
    if (selectable.length === 0) return;
    const currentIndex = selectable.findIndex((item) => item.key === activeKey);
    const nextIndex =
      currentIndex === -1
        ? delta > 0
          ? 0
          : selectable.length - 1
        : (currentIndex + delta + selectable.length) % selectable.length;
    setActiveKey(selectable[nextIndex]?.key ?? null);
  }

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu(true);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setPosition(measure());
      setOpen(true);
      setActiveKey(selectable[selectable.length - 1]?.key ?? null);
    }
  }

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveKey(selectable[0]?.key ?? null);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveKey(selectable[selectable.length - 1]?.key ?? null);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      close();
    }
  }

  function select(item: DropdownItem) {
    setOpen(false);
    setPosition(null);
    setActiveKey(null);
    triggerRef.current?.focus();
    item.onSelect();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu(false))}
        onKeyDown={onTriggerKeyDown}
        className="hover:bg-tint rounded-pill inline-flex cursor-pointer items-center gap-1.5 px-1 py-1"
      >
        {trigger}
      </button>
      {open && position ? (
        <Portal>
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            style={{
              top: position.top,
              left: position.left,
              minWidth: position.minWidth,
            }}
            className="rounded-menu border-cardline bg-card shadow-menu fixed z-[70] max-h-[min(70vh,420px)] overflow-y-auto border p-1.5"
          >
            {items.map((entry) => {
              if (isSeparator(entry)) {
                return (
                  <div
                    key={entry.key}
                    className="bg-hairline mx-1 my-1.5 h-px"
                    role="none"
                  />
                );
              }
              if (isSectionLabel(entry)) {
                return (
                  <div
                    key={entry.key}
                    className="text-faint px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-[0.06em] uppercase"
                    role="presentation"
                  >
                    {entry.sectionLabel}
                  </div>
                );
              }
              const danger = entry.tone === "danger";
              return (
                <button
                  key={entry.key}
                  ref={(node) => {
                    if (node) itemRefs.current.set(entry.key, node);
                    else itemRefs.current.delete(entry.key);
                  }}
                  type="button"
                  role="menuitem"
                  disabled={entry.disabled}
                  onClick={() => select(entry)}
                  onMouseEnter={() => setActiveKey(entry.key)}
                  className={`rounded-input flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-45 ${
                    danger
                      ? "text-danger not-disabled:hover:bg-danger-soft"
                      : "text-secondary not-disabled:hover:bg-tint"
                  } ${activeKey === entry.key ? (danger ? "bg-danger-soft" : "bg-tint") : ""}`}
                >
                  {entry.icon ? (
                    <span className="inline-flex w-4 shrink-0 justify-center">
                      {entry.icon}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {entry.label}
                  </span>
                  {entry.hint ? (
                    <span className="text-faint shrink-0 text-[11px]">{entry.hint}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Portal>
      ) : null}
    </>
  );
}
