import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Building2, Inbox } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { AppShell, PageTitle } from "./app-shell";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Spinner } from "../../ui/spinner";
import { ROLE_DESCRIPTIONS } from "../../../consts/roles";
import type { MyInvite } from "../../../lib/api/types";

export function InvitesScreen() {
  const router = useRouter();
  const { api, session, ready, toast, handleError } = useApp();
  const [invites, setInvites] = useState<MyInvite[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { invites: all } = await api.invites.listMine();
    setInvites(all.filter((i) => i.status === "PENDING"));
  }, [api]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      void router.replace("/login");
      return;
    }
    void load().catch((error) => handleError(error));
  }, [ready, session, load, router, handleError]);

  async function accept(invite: MyInvite) {
    setBusyId(invite.id);
    try {
      await api.invites.accept({ inviteId: invite.id });
      toast(`Joined ${invite.orgName}`, "success");
      await router.push(`/orgs/${invite.orgId}/settings`);
    } catch (error) {
      handleError(error);
      setBusyId(null);
    }
  }

  async function decline(invite: MyInvite) {
    setBusyId(invite.id);
    try {
      await api.invites.decline({ inviteId: invite.id });
      toast("Invite declined");
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setBusyId(null);
    }
  }

  if (!invites) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner size={28} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageTitle
        title="Invitations"
        description="Organizations that have invited you to join them. Accept to become a member, or decline to clear it."
      />

      {invites.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-cardline bg-card py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-tint text-tertiary">
            <Inbox className="size-5" />
          </span>
          <p className="text-sm font-semibold text-ink">No invitations right now</p>
          <p className="max-w-xs text-[13px] text-secondary">
            When someone invites you to their organization, it&apos;ll show up here for you to accept or
            decline.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-col gap-4 rounded-card border border-accent-border bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-accent">
                  <Building2 className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-semibold text-ink">{invite.orgName}</p>
                    <Badge variant="accent">{invite.role.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-secondary">
                    {invite.invitedByEmail ? `${invite.invitedByEmail} invited you` : "You've been invited"} to
                    join as {invite.role[0] + invite.role.slice(1).toLowerCase()}.
                  </p>
                  <p className="mt-1 text-xs text-tertiary">{ROLE_DESCRIPTIONS[invite.role]}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void decline(invite)}
                  disabled={busyId === invite.id}
                >
                  Decline
                </Button>
                <Button variant="accent" onClick={() => void accept(invite)} loading={busyId === invite.id}>
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
