import type { ReactNode } from "react";
import type { UserStatus } from "@kytelink/schemas";
import { Button } from "../../ui/button";

export interface UserDangerZoneProps {
  status: UserStatus;
  busy: boolean;
  statusLocked: boolean;
  statusLockedHint?: string;
  onForceLogout: () => void;
  onSuspend: () => void;
  onRestore: () => void;
  onBan: () => void;
}

interface DangerRow {
  key: string;
  title: string;
  consequence: string;
  action: ReactNode;
  hint?: string;
}

export function UserDangerZone({
  status,
  busy,
  statusLocked,
  statusLockedHint,
  onForceLogout,
  onSuspend,
  onRestore,
  onBan,
}: UserDangerZoneProps) {
  const rows: DangerRow[] = [
    {
      key: "logout",
      title: "Force logout",
      consequence: "Ends every active session. They can sign straight back in.",
      action: (
        <Button size="sm" tone="secondary" busy={busy} onClick={onForceLogout}>
          Force logout
        </Button>
      ),
    },
  ];

  if (status === "ACTIVE") {
    rows.push({
      key: "suspend",
      title: "Suspend account",
      consequence:
        "Suspends every org they belong to, so every kyte in those orgs goes offline. They can still log in read-only and appeal.",
      action: (
        <Button size="sm" tone="danger" disabled={statusLocked} busy={busy} onClick={onSuspend}>
          Suspend…
        </Button>
      ),
      ...(statusLocked && statusLockedHint ? { hint: statusLockedHint } : {}),
    });
  } else {
    rows.push({
      key: "restore",
      title: "Restore account",
      consequence:
        "Lifts the suspension and brings back every org it took down. Orgs and kytes suspended on their own stay down.",
      action: (
        <Button size="sm" tone="secondary" busy={busy} onClick={onRestore}>
          Restore…
        </Button>
      ),
    });
  }

  rows.push({
    key: "ban",
    title: "Ban & erase",
    consequence:
      "Deletes the account, every org they own, and every kyte and file in those orgs. Frees their usernames and blocks this email from ever signing up again. Cannot be undone.",
    action: (
      <Button size="sm" tone="danger" disabled={statusLocked} busy={busy} onClick={onBan}>
        Ban…
      </Button>
    ),
    ...(statusLocked && statusLockedHint ? { hint: statusLockedHint } : {}),
  });

  return (
    <section
      aria-labelledby="user-danger-zone-title"
      className="rounded-card border border-danger-border bg-card p-5"
    >
      <h2 id="user-danger-zone-title" className="text-[13px] font-semibold text-danger">
        Danger zone
      </h2>
      <p className="mt-1 text-[13px] text-secondary">
        Every action here is recorded in the audit log with the reason you give.
      </p>
      <ul className="mt-4 flex flex-col divide-y divide-hairline">
        {rows.map((row) => (
          <li key={row.key} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 max-w-lg">
              <p className="text-[13px] font-medium text-ink">{row.title}</p>
              <p className="text-[12px] leading-relaxed text-tertiary">{row.consequence}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {row.action}
              {row.hint ? <span className="text-[12px] text-tertiary">{row.hint}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
