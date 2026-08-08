import { ShieldAlert } from "lucide-react";
import { appealUrl } from "../../consts/appeal";
import { SUPPORT_URL } from "../../consts/brand";

export interface AccountSuspendedBannerProps {
  reason: string | null;
}

/**
 * Sits above every app screen rather than inside one: the account is read-only
 * everywhere, so the notice can't belong to a single route.
 */
export function AccountSuspendedBanner({ reason }: AccountSuspendedBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b border-danger-border bg-danger-subtle px-4 py-2.5 text-center text-[13px] leading-relaxed text-danger"
    >
      <span className="inline-flex items-center gap-2">
        <ShieldAlert className="size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-medium">Your account is suspended</span>
          {reason ? ` — ${reason}` : null}. You can browse, but not make changes.
        </span>
      </span>
      <span className="inline-flex items-center gap-3">
        <a
          href={appealUrl("user")}
          className="cursor-pointer rounded-pill bg-danger px-3 py-1 font-medium text-white outline-none transition-colors hover:opacity-90"
        >
          Appeal
        </a>
        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noreferrer"
          className="cursor-pointer underline underline-offset-2 outline-none hover:opacity-80"
        >
          Contact support
        </a>
      </span>
    </div>
  );
}
