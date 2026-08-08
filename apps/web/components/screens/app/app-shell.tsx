import type { ReactNode } from "react";
import Link from "next/link";
import { AccountMenu } from "../../shared/account-menu";

export interface AppShellProps {
  children: ReactNode;
}

function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/home" className="flex items-center" aria-label="Kytelink">
          <span className="text-[22px] leading-none" aria-hidden>
            🪁
          </span>
        </Link>

        <AccountMenu />
      </div>
    </header>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh overscroll-y-none bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-12">{children}</main>
    </div>
  );
}

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">{title}</h1>
        {description ? <p className="mt-1.5 text-[15px] text-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
