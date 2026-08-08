import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { MobileNav } from "./mobile-nav";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";

/**
 * Boot paints the finished chrome — the same nav, top bar and content gutters
 * the session lands in — so resolving the session swaps content into a frame
 * that never moves.
 */
function BootFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas text-ink flex h-dvh overflow-hidden">
      <SideNav />
      <div className="stable-gutter flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-none">
        <TopBar booting />
        <MobileNav />
        <main className="relative flex-1 px-4 py-5 md:px-8 md:py-7">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function BootLoadingScreen() {
  return (
    <BootFrame>
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden"
        role="status"
        aria-label="Loading the admin dashboard"
      >
        <span className="boot-bar bg-accent block h-full w-1/5" />
      </span>
    </BootFrame>
  );
}

export function BootErrorScreen({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <BootFrame>
      <div className="rounded-card border-cardline mx-auto flex max-w-md flex-col items-center gap-2 border px-6 py-12 text-center">
        <h1 className="text-ink text-[15px] font-semibold">{title}</h1>
        <p className="text-secondary text-[13px] leading-relaxed">{description}</p>
        <div className="mt-3">
          <Button tone="primary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    </BootFrame>
  );
}
