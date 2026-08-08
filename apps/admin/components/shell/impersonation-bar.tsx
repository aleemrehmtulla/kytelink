import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { WEB_APP_URL } from "../../lib/urls";
import { useImpersonation } from "./impersonation-context";

function minutesLeft(expiresAt: string, now: number): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 60_000));
}

export function ImpersonationBar() {
  const { status, refresh, stop } = useImpersonation();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  const expiresAt = status.active ? status.expiresAt : undefined;
  // Expired grants are already inert on the API — re-reading status is what
  // clears the banner rather than leaving it advertising a dead session.
  useEffect(() => {
    if (!expiresAt) return;
    if (minutesLeft(expiresAt, Date.now()) === 0) {
      refresh();
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [expiresAt, now, refresh]);

  if (!status.active || !status.user || !expiresAt) return null;

  const remaining = minutesLeft(expiresAt, now);
  if (remaining === 0) return null;

  async function end() {
    setBusy(true);
    try {
      await stop();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-warning-border bg-warning-soft text-warning border-b">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:px-8">
        <span className="text-[13px] font-semibold">
          Viewing the product as {status.user.email}
        </span>
        <span className="rounded-pill border-warning-border border px-2 py-0.5 text-[11px] font-medium">
          {status.readOnly ? "Read-only" : "Full access"}
        </span>
        <span className="text-[12px]">
          Ends in {remaining} min. The admin app is still you.
        </span>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`${WEB_APP_URL}/home`}
            target="_blank"
            rel="noreferrer"
            className="rounded-pill border-warning-border bg-card text-warning hover:bg-warning-soft cursor-pointer border px-3 py-1 text-[12px] font-medium"
          >
            Open their view
          </a>
          <Button size="sm" tone="warning" busy={busy} onClick={() => void end()}>
            End session
          </Button>
        </div>
      </div>
    </div>
  );
}
