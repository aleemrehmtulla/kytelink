import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { can, type Role } from "@kytelink/schemas";
import { AlertTriangle, HardDrive, Lock, LogOut, UserPlus } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { AppShell, PageTitle } from "./app-shell";
import { MemberRoleDialog } from "../editor/member-role-dialog";
import { ROLE_DESCRIPTIONS } from "../../../consts/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { Badge } from "../../ui/badge";
import { Progress } from "../../ui/progress";
import { Spinner } from "../../ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { INVITABLE_ROLE_LIST } from "../../../consts/roles";
import { cn } from "@/lib/cn";
import type { Member, OrgInvitePayload, OrgStorage, OrgSummary } from "../../../lib/api/types";

type InviteRole = OrgInvitePayload["role"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function roleLabel(role: Role): string {
  return role[0] + role.slice(1).toLowerCase();
}

function accessChip(member: Member, totalKytes: number): string {
  if (member.role === "OWNER") return "Owner";
  if (member.role === "ADMIN") return "Org admin";
  if (member.kyteAccess === "ALL") return `All Kytelinks · ${roleLabel(member.role)}`;
  return `${member.kyteGrants.length} of ${totalKytes} Kytelinks`;
}

export function OrgSettingsScreen({ orgId }: { orgId: string }) {
  const router = useRouter();
  const { api, session, ready, handleError } = useApp();
  const [org, setOrg] = useState<OrgSummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [storage, setStorage] = useState<OrgStorage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const load = useCallback(async () => {
    const { orgs } = await api.org.listMine();
    const found = orgs.find((o) => o.id === orgId);
    if (!found) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setOrg(found);
    const [{ members: m }, s] = await Promise.all([
      api.team.members({ orgId }),
      api.org.storage({ orgId }).catch(() => null),
    ]);
    setMembers(m);
    setStorage(s);
    setLoading(false);
  }, [api, orgId]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      void router.replace("/login");
      return;
    }
    void load().catch((error) => {
      handleError(error);
      setLoading(false);
    });
  }, [ready, session, load, router, handleError]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner size={28} />
        </div>
      </AppShell>
    );
  }

  if (notFound || !org) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-lg font-semibold text-ink">Organization not found</h1>
          <p className="mt-1 text-sm text-secondary">You may not have access, or it was deleted.</p>
          <Button variant="accent" className="mt-5" onClick={() => void router.push("/home")}>
            Back to home
          </Button>
        </div>
      </AppShell>
    );
  }

  const canManageSettings = can(org.role, "manage_org_settings");
  const canManageMembers = can(org.role, "manage_members");
  const isOwner = org.role === "OWNER";

  return (
    <AppShell>
      <PageTitle
        title={org.name}
        description="Organization settings — members, storage, and more."
      />

      <div className="flex flex-col gap-6">
        <GeneralCard org={org} canEdit={canManageSettings} onRenamed={load} />

        <MembersCard
          org={org}
          members={members}
          canManage={canManageMembers}
          onInvited={load}
          onSelectMember={setSelectedMember}
        />

        <StorageCard storage={storage} />

        <DangerCard org={org} isOwner={isOwner} onDone={() => router.push("/home")} />
      </div>

      <MemberRoleDialog
        open={selectedMember !== null}
        member={selectedMember}
        orgId={org.id}
        orgKytes={org.kytes}
        onClose={() => setSelectedMember(null)}
        onSaved={load}
      />
    </AppShell>
  );
}

function GeneralCard({ org, canEdit, onRenamed }: { org: OrgSummary; canEdit: boolean; onRenamed: () => void }) {
  const { api, toast, handleError } = useApp();
  const [name, setName] = useState(org.name);
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== org.name && name.trim().length > 0;

  async function save() {
    setSaving(true);
    try {
      await api.org.rename({ orgId: org.id, name: name.trim() });
      toast("Organization renamed", "success");
      onRenamed();
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>The name teammates see across Kytelink.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextInput label="Name" value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)} />
        </div>
        {canEdit ? (
          <Button variant="primary" className="rounded-input" onClick={save} loading={saving} disabled={!dirty}>
            Save
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MembersCard({
  org,
  members,
  canManage,
  onInvited,
  onSelectMember,
}: {
  org: OrgSummary;
  members: Member[];
  canManage: boolean;
  onInvited: () => void;
  onSelectMember: (member: Member) => void;
}) {
  const { api, toast, handleError } = useApp();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("EDITOR");
  const [inviting, setInviting] = useState(false);

  async function invite() {
    if (!email.includes("@")) return;
    setInviting(true);
    try {
      await api.team.invite({ orgId: org.id, email: email.trim(), role, kyteAccess: "ALL" });
      setEmail("");
      toast("Invite sent", "success");
      onInvited();
    } catch (error) {
      handleError(error);
    } finally {
      setInviting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          {members.length} {members.length === 1 ? "person" : "people"} in this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canManage ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <TextInput
                  type="email"
                  placeholder="teammate@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && invite()}
                />
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
                <SelectTrigger className="h-[42px] sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLE_LIST.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="primary"
                className="h-[42px] rounded-input"
                onClick={invite}
                loading={inviting}
                disabled={!email.includes("@")}
              >
                <UserPlus />
                Invite
              </Button>
            </div>
            <RoleExplainer selected={role} />
          </div>
        ) : null}

        <div className="overflow-hidden rounded-input border border-cardline">
          {members.map((member, index) => (
            <button
              key={member.membershipId}
              type="button"
              disabled={!canManage}
              onClick={() => onSelectMember(member)}
              className={cnRow(index)}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-[11px] font-semibold text-accent"
                aria-hidden
              >
                {member.email[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{member.email}</span>
              <Badge variant="outline">{accessChip(member, org.kytes.length)}</Badge>
            </button>
          ))}
        </div>
        {canManage ? (
          <p className="text-xs text-tertiary">Select a member to change their role or remove them.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function cnRow(index: number): string {
  return [
    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
    "not-disabled:hover:bg-tint disabled:cursor-not-allowed",
    index > 0 ? "border-t border-hairline" : "",
  ].join(" ");
}

function RoleExplainer({ selected }: { selected: InviteRole }) {
  return (
    <div className="rounded-input border border-cardline bg-tint p-3">
      <p className="mb-2 text-xs font-medium text-secondary">What each role can do</p>
      <ul className="flex flex-col gap-1.5">
        {INVITABLE_ROLE_LIST.map((r) => (
          <li key={r} className="flex items-start gap-2 text-xs">
            <span
              className={cn(
                "mt-px inline-flex w-[68px] shrink-0 justify-center rounded-pill px-2 py-0.5 text-[11px] font-semibold",
                r === selected
                  ? "bg-accent-soft text-accent"
                  : "border border-cardline bg-card text-tertiary",
              )}
            >
              {roleLabel(r)}
            </span>
            <span className="text-secondary">{ROLE_DESCRIPTIONS[r]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StorageCard({ storage }: { storage: OrgStorage | null }) {
  const pct = useMemo(() => {
    if (!storage || storage.limitBytes === 0) return 0;
    return Math.min(100, (storage.usedBytes / storage.limitBytes) * 100);
  }, [storage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-4 text-muted-foreground" />
          Storage
        </CardTitle>
        <CardDescription>Shared across every Kytelink in this organization.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!storage ? (
          <p className="text-sm text-muted-foreground">Storage usage is unavailable right now.</p>
        ) : (
          <>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-medium text-foreground">{formatBytes(storage.usedBytes)}</span>
                <span className="text-muted-foreground">of {formatBytes(storage.limitBytes)}</span>
              </div>
              <Progress value={pct} indicatorClassName={pct > 90 ? "bg-danger" : "bg-foreground"} />
            </div>
            {storage.kytes.length > 0 ? (
              <div className="flex flex-col gap-2">
                {storage.kytes
                  .slice()
                  .sort((a, b) => b.bytes - a.bytes)
                  .map((k) => (
                    <div key={k.kyteId} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">{k.displayName || "Untitled"}</span>
                      <span className="text-foreground">{formatBytes(k.bytes)}</span>
                    </div>
                  ))}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DangerCard({ org, isOwner, onDone }: { org: OrgSummary; isOwner: boolean; onDone: () => void }) {
  const { api, toast, handleError } = useApp();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    try {
      await api.org.leave({ orgId: org.id });
      toast("You left the organization", "success");
      onDone();
    } catch (error) {
      handleError(error);
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.org.delete({ orgId: org.id, confirm: confirm.trim() });
      toast("Organization deleted", "success");
      onDone();
    } catch (error) {
      handleError(error);
      setBusy(false);
    }
  }

  if (org.personal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            Your default organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[13px] text-secondary">
            This is your default organization, so it can&apos;t be deleted or left. It&apos;s removed
            automatically when you delete your account. Create a separate organization for team work you
            might want to wind down later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-danger-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-danger">
          <AlertTriangle className="size-4" />
          Danger zone
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isOwner ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Delete this organization</p>
              <p className="text-[13px] text-secondary">
                Gone for good, no dark patterns — delete its Kytelinks first.
              </p>
            </div>
            <Button variant="danger" className="rounded-input" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Leave this organization</p>
              <p className="text-[13px] text-secondary">You&apos;ll lose access to its Kytelinks.</p>
            </div>
            <Button variant="danger" className="rounded-input" loading={busy} onClick={leave}>
              <LogOut />
              Leave
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={deleteOpen} onOpenChange={(next) => (next ? null : setDeleteOpen(false))}>
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>Delete {org.name}?</DialogTitle>
            <DialogDescription>
              This can't be undone. Type <span className="font-medium text-foreground">{org.name}</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <TextInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={org.name} autoFocus />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} disabled={confirm.trim() !== org.name} onClick={remove}>
              Delete organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
