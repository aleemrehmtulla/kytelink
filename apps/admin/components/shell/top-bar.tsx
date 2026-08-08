import Link from "next/link";
import { AccountMenu } from "./account-menu";
import { SearchGlyph } from "./icons";

export interface TopBarProps {
  onOpenPalette?: () => void;
  /** Boot renders the same bar with the account slot reserved but not filled. */
  booting?: boolean;
}

export function TopBar({ onOpenPalette, booting = false }: TopBarProps) {
  return (
    <div className="border-hairline bg-card sticky top-0 z-40 border-b">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          <Link
            href="/overview"
            className="flex cursor-pointer items-center"
            aria-label="Kytelink admin"
          >
            <span className="text-[20px] leading-none" aria-hidden="true">
              🪁
            </span>
          </Link>
          <span className="text-tertiary text-[11px] font-semibold tracking-[0.1em] uppercase">
            Admin
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          disabled={booting}
          className="rounded-pill border-border bg-card text-tertiary not-disabled:hover:border-accent-border not-disabled:hover:text-secondary hidden w-[320px] cursor-pointer items-center gap-2 border px-3.5 py-1.5 text-[13px] disabled:cursor-default md:flex"
        >
          <SearchGlyph className="shrink-0" />
          Search users, orgs, kytes
          <kbd className="border-hairline text-faint ml-auto rounded-[6px] border px-1.5 py-0.5 font-mono text-[11px]">
            ⌘K
          </kbd>
        </button>

        <div className="flex h-8 shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenPalette}
            disabled={booting}
            aria-label="Search"
            className="rounded-pill border-border bg-card text-tertiary not-disabled:hover:border-accent-border flex h-8 w-8 cursor-pointer items-center justify-center border disabled:cursor-default md:hidden"
          >
            <SearchGlyph />
          </button>
          {booting ? (
            <span
              aria-hidden="true"
              className="rounded-pill border-hairline h-8 w-8 border"
            />
          ) : (
            <AccountMenu />
          )}
        </div>
      </div>
    </div>
  );
}
