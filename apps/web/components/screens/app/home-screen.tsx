import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { can } from "@kytelink/schemas";
import { ArrowRight, ArrowUpRight, Building2, Mail, Plus, Settings, Trash2 } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { AppShell, PageTitle } from "./app-shell";
import { CreateOrgDialog } from "../editor/create-org-dialog";
import { CreateKyteDialog } from "./create-kyte-dialog";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Spinner } from "../../ui/spinner";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../ui/context-menu";
import type { KyteSummary, OrgSummary } from "../../../lib/api/types";

function kyteLabel(kyte: KyteSummary): string {
  return kyte.displayName || (kyte.username ? `@${kyte.username}` : "Untitled");
}

export function HomeScreen() {
  const router = useRouter();
  const { api, session, ready, handleError, toast } = useApp();
  const [orgs, setOrgs] = useState<OrgSummary[] | null>(null);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [createKyteOrg, setCreateKyteOrg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KyteSummary | null>(null);

  const load = useCallback(async () => {
    const [{ orgs: mine }, { invites }] = await Promise.all([api.org.listMine(), api.invites.listMine()]);
    setOrgs(mine);
    setPendingInvites(invites.filter((i) => i.status === "PENDING").length);
  }, [api]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      void router.replace("/login");
      return;
    }
    void load().catch((error) => handleError(error));
  }, [ready, session, load, router, handleError]);

  async function onKyteCreated(kyteId: string) {
    setCreateKyteOrg(null);
    await router.push(`/edit/links?kyte=${kyteId}`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.kyte.delete({ kyteId: deleteTarget.id, confirm: deleteTarget.username ?? deleteTarget.id });
      toast("Kytelink deleted", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      handleError(error);
    }
  }

  if (!orgs) {
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
        title="Home"
        description="Your Kytelinks and organizations."
        action={
          <Button variant="secondary" onClick={() => setCreateOrgOpen(true)}>
            <Building2 />
            New organization
          </Button>
        }
      />

      {pendingInvites > 0 ? (
        <Link
          href="/invites"
          className="mb-7 flex items-center gap-3 rounded-card border border-accent-border bg-accent-soft px-4 py-3.5 text-sm transition-colors hover:bg-accent-soft/70"
        >
          <span className="flex size-8 items-center justify-center rounded-input bg-card text-accent">
            <Mail className="size-4" />
          </span>
          <span className="flex-1 font-medium text-ink">
            You have {pendingInvites} pending {pendingInvites === 1 ? "invite" : "invites"}.
          </span>
          <ArrowRight className="size-4 text-accent" />
        </Link>
      ) : null}

      <div className="flex flex-col gap-9">
        {orgs.map((org) => (
          <OrgSection
            key={org.id}
            org={org}
            onNewKyte={() => setCreateKyteOrg(org.id)}
            onDeleteKyte={(kyte) => setDeleteTarget(kyte)}
          />
        ))}
      </div>

      <CreateOrgDialog
        open={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        onCreated={() => void load()}
      />

      <CreateKyteDialog
        orgId={createKyteOrg}
        onClose={() => setCreateKyteOrg(null)}
        onCreated={(kyteId) => void onKyteCreated(kyteId)}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(next) => (next ? null : setDeleteTarget(null))}>
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>Delete Kytelink</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  This permanently deletes{" "}
                  <span className="font-medium text-ink">{kyteLabel(deleteTarget)}</span> and its content. This
                  can&apos;t be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()}>
              <Trash2 />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function OrgSection({
  org,
  onNewKyte,
  onDeleteKyte,
}: {
  org: OrgSummary;
  onNewKyte: () => void;
  onDeleteKyte: (kyte: KyteSummary) => void;
}) {
  const canCreate = can(org.role, "create_kyte");
  return (
    <section>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-ink">{org.name}</h2>
          {org.personal ? (
            <Badge variant="neutral">Default</Badge>
          ) : (
            <Badge variant="outline">{org.role.toLowerCase()}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${org.id}/settings`}>
              <Settings />
              Settings
            </Link>
          </Button>
          {canCreate ? (
            <Button variant="accent" size="sm" onClick={onNewKyte}>
              <Plus />
              New Kytelink
            </Button>
          ) : null}
        </div>
      </div>

      {org.kytes.length === 0 ? (
        <button
          type="button"
          disabled={!canCreate}
          onClick={onNewKyte}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-card border border-accent-border bg-accent-soft px-6 py-11 text-center transition-colors not-disabled:hover:bg-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex size-10 items-center justify-center rounded-input bg-card text-accent">
            <Plus className="size-5" />
          </span>
          <span className="text-sm font-medium text-ink">Create your first Kytelink</span>
          <span className="text-[13px] text-secondary">Claim a link, add your content, publish.</span>
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {org.kytes.map((kyte) => (
            <KyteCard key={kyte.id} kyte={kyte} onDelete={() => onDeleteKyte(kyte)} />
          ))}
        </div>
      )}
    </section>
  );
}

function KyteCard({ kyte, onDelete }: { kyte: KyteSummary; onDelete: () => void }) {
  const name = kyteLabel(kyte);
  const canDelete = kyte.effectiveRole ? can(kyte.effectiveRole, "delete_kyte") : false;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link
          href={`/edit/links?kyte=${kyte.id}`}
          className="group flex flex-col gap-3 rounded-card border border-cardline bg-card p-4 transition-colors hover:border-border hover:bg-tint"
        >
          <div className="flex items-start gap-3">
            <Avatar className="size-10">
              <AvatarFallback name={name} />
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              {kyte.username ? (
                <p className="truncate text-xs text-faint">kytelink.com/{kyte.username}</p>
              ) : (
                <p className="truncate text-xs text-faint">No link claimed yet</p>
              )}
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={kyte.published ? "success" : "neutral"}>{kyte.published ? "Live" : "Draft"}</Badge>
            {kyte.moderationStatus !== "APPROVED" ? (
              <Badge variant="danger">{kyte.moderationStatus.toLowerCase()}</Badge>
            ) : null}
            {kyte.effectiveRole && kyte.effectiveRole !== "OWNER" ? (
              <Badge variant="outline">{kyte.effectiveRole.toLowerCase()}</Badge>
            ) : null}
          </div>
        </Link>
      </ContextMenuTrigger>
      {canDelete ? (
        <ContextMenuContent>
          <ContextMenuItem
            destructive
            onSelect={() => onDelete()}
          >
            <Trash2 />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      ) : null}
    </ContextMenu>
  );
}
