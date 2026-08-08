import { Eye, LogOut } from "lucide-react";
import { useState } from "react";
import type { Impersonation } from "@/lib/auth/impersonation";

export interface ImpersonationBarProps {
  impersonation: Impersonation;
  onExit: () => Promise<void>;
}

/**
 * Pinned to the bottom rather than the top: the editor and account screens both
 * own the top of the viewport with sticky chrome, and an admin must never lose
 * sight of whose data they are looking at because a page scrolled.
 */
export function ImpersonationBar({ impersonation, onExit }: ImpersonationBarProps) {
  const [busy, setBusy] = useState(false);

  async function exit() {
    setBusy(true);
    try {
      await onExit();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-pill bg-primary px-4 py-2 text-sm text-primary-foreground shadow-menu">
        <Eye className="size-4 shrink-0" />
        <span className="min-w-0 truncate">
          Admin view of <span className="font-medium">{impersonation.email}</span>
          {impersonation.readOnly ? " · read-only" : " · full access"}
        </span>
        <button
          type="button"
          onClick={() => void exit()}
          disabled={busy}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-pill bg-primary-foreground/15 px-3 py-1 font-medium not-disabled:hover:bg-primary-foreground/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="size-3.5" />
          Exit
        </button>
      </div>
    </div>
  );
}
