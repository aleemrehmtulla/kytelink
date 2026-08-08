import { Button } from "../../ui/button";
import { Section } from "../../ui/section";

export interface UserImpersonationCardProps {
  email: string;
  busy: boolean;
  /** Set when this account can't be viewed as — the copy explains why. */
  blockedReason?: string;
  /** Live session against *this* account, started from anywhere. */
  activeReadOnly?: boolean;
  onStart: () => void;
  onEnd: () => void;
}

export function UserImpersonationCard({
  email,
  busy,
  blockedReason,
  activeReadOnly,
  onStart,
  onEnd,
}: UserImpersonationCardProps) {
  const active = activeReadOnly !== undefined;

  return (
    <Section
      title="View as this user"
      description="Opens the editor in a new tab signed in as them, so you can see the bug they're describing. Your own admin session keeps working here."
      action={
        active ? (
          <Button size="sm" tone="warning" busy={busy} onClick={onEnd}>
            End session
          </Button>
        ) : (
          <Button
            size="sm"
            tone="secondary"
            busy={busy}
            disabled={blockedReason !== undefined}
            onClick={onStart}
          >
            View as user…
          </Button>
        )
      }
    >
      <p className="text-tertiary text-[12px] leading-relaxed">
        {blockedReason ??
          (active
            ? `A ${activeReadOnly ? "read-only" : "full-access"} session as ${email} is open right now.`
            : "Full access — anything you change is a real change to their account. Capped at 30 minutes, and both the start and the end are written to the audit log with your reason. Read-only is a checkbox away.")}
      </p>
    </Section>
  );
}
