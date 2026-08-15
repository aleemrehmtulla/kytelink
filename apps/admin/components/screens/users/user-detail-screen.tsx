import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { LIMIT_DEFAULTS } from "@kytelink/schemas";
import type { UserStatus } from "@kytelink/schemas";
import { LimitEditor } from "../../limit-editor";
import { copyText } from "../../ui/clipboard";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { CopyId } from "../../ui/copy-id";
import { DetailList } from "../../ui/detail-list";
import { Dropdown, type DropdownProps } from "../../ui/dropdown";
import { EmptyState } from "../../ui/empty-state";
import { ErrorState } from "../../ui/error-state";
import { LoadingState } from "../../ui/loading-state";
import { PageHeader } from "../../ui/page-header";
import { Section } from "../../ui/section";
import { StatGroup } from "../../ui/stat-group";
import { UserStatusPill } from "../../ui/status-pill";
import { useToast } from "../../ui/toast";
import { useAdminMe } from "../../../hooks/use-admin-me";
import { useAdminSource } from "../../../hooks/use-admin-source";
import { useAsync } from "../../../hooks/use-async";
import { useImpersonation } from "../../shell/impersonation-context";
import { startImpersonation } from "../../../lib/impersonation";
import {
  formatBytes,
  formatDateTimeFull,
  formatNumber,
  formatRelativeTime,
  personLabel,
} from "../../../lib/format";
import type { UserDetail } from "../../../lib/admin-source";
import { banUserCopy } from "../moderation/moderation-copy";
import { ImpersonateDialog, type ImpersonateIntent } from "./impersonate-dialog";
import { UserAvatar } from "./user-avatar";
import { UserDangerZone } from "./user-danger-zone";
import { UserImpersonationCard } from "./user-impersonation-card";
import { UserMembershipsCard } from "./user-memberships-card";
import { UserStatusBanner } from "./user-status-banner";
import { UserStatusDialog, type UserStatusIntent } from "./user-status-dialog";

export interface UserDetailScreenProps {
  userId: string;
}

interface StatusOverride {
  status: UserStatus;
  statusReason: string | null;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
}

interface PendingStatusChange {
  intent: UserStatusIntent;
  status: UserStatus;
  present: string;
  past: string;
}


export function UserDetailScreen({ userId }: UserDetailScreenProps) {
  const router = useRouter();
  const source = useAdminSource();
  const { toast } = useToast();

  const fetchUser = useCallback(() => source.userDetail(userId), [source, userId]);
  const { data, status, reload } = useAsync(fetchUser);
  const me = useAdminMe();
  const impersonation = useImpersonation();

  const [override, setOverride] = useState<StatusOverride | null>(null);
  const [pending, setPending] = useState<PendingStatusChange | null>(null);
  const [banning, setBanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewAs, setViewAs] = useState<ImpersonateIntent | null>(null);
  const [viewAsReadOnly, setViewAsReadOnly] = useState(false);
  const [viewAsError, setViewAsError] = useState<string | null>(null);

  const [lastData, setLastData] = useState<UserDetail | null | undefined>(data);
  if (data !== lastData) {
    setLastData(data);
    setOverride(null);
  }

  if (status === "loading" && !data) {
    return (
      <>
        <PageHeader title="User" />
        <LoadingState rows={6} />
      </>
    );
  }

  if (data === null) {
    return (
      <>
        <PageHeader title="User" />
        <EmptyState
          title="No such account"
          description="This user ID doesn't exist any more — it may have been deleted."
          framed
        />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title="User" />
        <ErrorState onRetry={reload} message="Couldn't load this account." />
      </>
    );
  }

  const user: UserDetail = override ? { ...data, ...override } : data;
  const displayName = personLabel(user.name, user.email);
  const isSelf = me.userId === user.id;
  const isPlatformAdmin = user.platformRole === "ADMIN";
  const statusLocked = isSelf || isPlatformAdmin;
  const statusLockedHint = isSelf
    ? "You can't change your own account status."
    : "Platform admins can't be suspended — remove the account from ADMIN_EMAILS first.";

  const impersonateBlocked = isSelf
    ? "This is your own account — you're already looking at their view."
    : isPlatformAdmin
      ? "Platform admins can't be impersonated."
      : user.status !== "ACTIVE"
        ? "This account is suspended, so their session is read-only. Restore it first."
        : undefined;
  const activeSession =
    impersonation.status.active && impersonation.status.user?.id === user.id
      ? impersonation.status
      : null;

  async function copy(value: string, what: string) {
    const copied = await copyText(value);
    if (copied) toast(`Copied ${what}.`);
    else toast(`Couldn't copy the ${what}.`, { tone: "danger" });
  }

  async function applyStatusChange(change: PendingStatusChange, reason: string) {
    setBusy(true);
    setActionError(null);
    setOverride({
      status: change.status,
      statusReason: change.status === "ACTIVE" ? null : reason,
      statusChangedAt: new Date().toISOString(),
      statusChangedBy: me.email,
    });
    try {
      await source.setUserStatus({ userId, status: change.status, reason });
      setPending(null);
      toast(`${change.past} ${user.email}.`);
      reload();
    } catch {
      setOverride(null);
      setActionError(`Couldn't ${change.present} this account. Try again.`);
      toast(`Couldn't ${change.present} ${user.email}.`, { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function applyBan(reason: string) {
    setBusy(true);
    setActionError(null);
    try {
      await source.banUser({ userId, reason });
      toast(`Banned ${user.email} and erased their account.`);
      // The account no longer exists — this detail page has nothing to show.
      void router.push("/users");
    } catch {
      setActionError("Couldn't ban this account. Nothing was deleted.");
      toast(`Couldn't ban ${user.email}.`, { tone: "danger" });
      setBusy(false);
    }
  }

  async function forceLogout() {
    setBusy(true);
    setActionError(null);
    try {
      await source.forceLogoutUser(userId);
      toast("Signed out of every device.");
      reload();
    } catch {
      setActionError("Couldn't sign this account out. Try again.");
      toast("Couldn't force logout.", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function beginImpersonation(reason: string) {
    setBusy(true);
    setViewAsError(null);
    try {
      const result = await startImpersonation({ userId, reason, readOnly: viewAsReadOnly });
      setViewAs(null);
      impersonation.refresh();
      // Their view opens in its own tab so this dashboard — which is still the
      // admin's own session — stays exactly where it was.
      window.open(result.url, "_blank", "noopener");
      toast(`Viewing as ${result.user.email} for ${result.ttlMinutes} minutes.`);
    } catch (error) {
      setViewAsError(error instanceof Error ? error.message : "Couldn't start the session.");
    } finally {
      setBusy(false);
    }
  }

  async function endImpersonation() {
    setBusy(true);
    try {
      await impersonation.stop();
      toast("Ended the session.");
    } catch {
      toast("Couldn't end the session.", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  function suspendIntent(): PendingStatusChange {
    return {
      intent: {
        kind: "suspend",
        email: user.email,
        orgCount: user.orgCount,
        kyteCount: user.publishedKyteCount,
      },
      status: "SUSPENDED",
      present: "suspend",
      past: "Suspended",
    };
  }

  function restoreIntent(): PendingStatusChange {
    return {
      intent: { kind: "restore", email: user.email },
      status: "ACTIVE",
      present: "restore",
      past: "Restored",
    };
  }

  const headerItems: DropdownProps["items"] = [
    { key: "copy-email", label: "Copy email", onSelect: () => void copy(user.email, "email address") },
    { key: "copy-id", label: "Copy user ID", onSelect: () => void copy(user.id, "user ID") },
    activeSession
      ? {
          key: "view-as",
          label: "End session as user",
          disabled: busy,
          onSelect: () => void endImpersonation(),
        }
      : {
          key: "view-as",
          label: "View as user…",
          disabled: impersonateBlocked !== undefined || busy,
          ...(impersonateBlocked ? { hint: impersonateBlocked } : {}),
          onSelect: () => {
            setViewAsError(null);
            setViewAsReadOnly(false);
            setViewAs({ email: user.email, name: user.name });
          },
        },
    {
      key: "logout",
      label: "Force logout",
      disabled: busy,
      onSelect: () => void forceLogout(),
    },
    { key: "sep", separator: true },
  ];

  if (user.status === "ACTIVE") {
    headerItems.push({
      key: "suspend",
      label: "Suspend user…",
      tone: "danger",
      disabled: statusLocked || busy,
      ...(statusLocked ? { hint: statusLockedHint } : {}),
      onSelect: () => setPending(suspendIntent()),
    });
  } else {
    headerItems.push({
      key: "restore",
      label: "Restore account…",
      disabled: busy,
      onSelect: () => setPending(restoreIntent()),
    });
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-[12px] text-tertiary">
        <Link href="/users" className="hover:text-ink">
          Users
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-secondary">{displayName}</span>
      </nav>

      <PageHeader
        title={displayName}
        description={user.email}
        action={
          <div className="flex items-center gap-2">
            <UserStatusPill status={user.status} />
            <Dropdown
              align="end"
              label="Account actions"
              trigger="Actions"
              items={headerItems}
            />
          </div>
        }
      />

      {user.status === "SUSPENDED" ? (
        <UserStatusBanner
          statusReason={user.statusReason}
          statusChangedAt={user.statusChangedAt}
          statusChangedBy={user.statusChangedBy}
          onRestore={() => setPending(restoreIntent())}
          restoreDisabled={busy}
        />
      ) : null}

      {actionError ? (
        <p className="mb-6 rounded-input border border-danger-border bg-danger-soft px-3 py-2 text-[12px] text-danger">
          {actionError}
        </p>
      ) : null}

      <div className="mb-6">
        <StatGroup
          columns={6}
          items={[
            {
              key: "orgs",
              label: "Orgs",
              value: formatNumber(user.orgCount),
              sub: "Memberships",
            },
            {
              key: "kytes",
              label: "Kytes",
              value: formatNumber(user.kyteCount),
              sub: "Across their orgs",
            },
            {
              key: "storage",
              label: "Storage",
              value: formatBytes(user.storageBytes),
              sub: "Orgs they own",
            },
            {
              key: "passkeys",
              label: "Passkeys",
              value: formatNumber(user.passkeyCount),
              sub: "Registered devices",
            },
            {
              key: "sessions",
              label: "Sessions",
              value: formatNumber(user.sessionCount),
              sub: "Signed in now",
            },
            {
              key: "last-active",
              label: "Last active",
              value: user.lastSessionAt
                ? formatRelativeTime(user.lastSessionAt)
                : "Never",
              sub: user.lastSessionAt
                ? formatDateTimeFull(user.lastSessionAt)
                : "No session yet",
            },
          ]}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Section
          title="Account"
          description="Who this is and how they got here."
          action={<UserAvatar name={user.name} email={user.email} size="lg" />}
        >
          <DetailList
            items={[
              {
                label: "Signed up",
                value: (
                  <span title={formatDateTimeFull(user.createdAt)}>
                    {formatRelativeTime(user.createdAt)}
                  </span>
                ),
              },
              { label: "User ID", value: <CopyId value={user.id} label="User ID" /> },
              {
                label: "Invites sent",
                value: formatNumber(user.invitesSent),
                hint: "Org invites they created",
              },
              {
                label: "Invites received",
                value: formatNumber(user.invitesReceived),
                hint: "Invites other people sent them",
              },
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-4 text-[13px]">
            <Link
              href={`/audit?actorEmail=${encodeURIComponent(user.email)}`}
              className="text-accent hover:text-accent-hover"
            >
              Audit log entries →
            </Link>
            <Link
              href={`/orgs?q=${encodeURIComponent(user.email)}`}
              className="text-accent hover:text-accent-hover"
            >
              Their orgs &amp; kytes →
            </Link>
          </div>
        </Section>

        <LimitEditor
          key={userId}
          fields={[
            {
              key: "maxOwnedOrgs",
              label: "Orgs they can own",
              hint: "Counts orgs they created, including their personal one.",
              defaultValue: LIMIT_DEFAULTS.orgsOwnedPerUser,
              value: user.maxOwnedOrgsOverride,
            },
            {
              key: "maxJoinedOrgs",
              label: "Orgs they can join",
              hint: "Orgs someone else owns that they can be a member of.",
              defaultValue: LIMIT_DEFAULTS.orgsJoinedPerUser,
              value: user.maxJoinedOrgsOverride,
            },
          ]}
          onSave={async (values) => {
            await source.setUserLimits({
              userId,
              maxOwnedOrgs: values.maxOwnedOrgs ?? null,
              maxJoinedOrgs: values.maxJoinedOrgs ?? null,
            });
            reload();
          }}
        />
      </div>

      <div className="mb-6">
        <UserMembershipsCard memberships={user.memberships} />
      </div>

      <div className="mb-6">
        <UserImpersonationCard
          email={user.email}
          busy={busy}
          {...(impersonateBlocked ? { blockedReason: impersonateBlocked } : {})}
          {...(activeSession ? { activeReadOnly: activeSession.readOnly ?? false } : {})}
          onStart={() => {
            setViewAsError(null);
            setViewAsReadOnly(false);
            setViewAs({ email: user.email, name: user.name });
          }}
          onEnd={() => void endImpersonation()}
        />
      </div>

      <UserDangerZone
        status={user.status}
        busy={busy}
        statusLocked={statusLocked}
        {...(statusLocked ? { statusLockedHint } : {})}
        onForceLogout={() => void forceLogout()}
        onSuspend={() => setPending(suspendIntent())}
        onRestore={() => setPending(restoreIntent())}
        onBan={() => {
          setActionError(null);
          setBanning(true);
        }}
      />

      <ConfirmDialog
        open={banning}
        title={`Ban ${displayName}?`}
        description={banUserCopy(user.email)}
        confirmLabel="Ban forever"
        tone="danger"
        requireReason
        typeToConfirm={user.email}
        details={[
          { label: "Email", value: user.email },
          {
            label: "Orgs erased",
            value: formatNumber(
              user.memberships.filter((membership) => membership.role === "OWNER").length,
            ),
          },
          {
            label: "Kytes erased",
            value: formatNumber(
              user.memberships
                .filter((membership) => membership.role === "OWNER")
                .reduce((total, membership) => total + membership.kyteCount, 0),
            ),
          },
          { label: "Storage erased", value: formatBytes(user.storageBytes) },
        ]}
        busy={busy}
        error={actionError}
        onConfirm={(reason) => void applyBan(reason)}
        onCancel={() => {
          setBanning(false);
          setActionError(null);
        }}
      />

      <UserStatusDialog
        intent={pending?.intent ?? null}
        busy={busy}
        error={actionError}
        onConfirm={(reason) => {
          if (pending) void applyStatusChange(pending, reason);
        }}
        onCancel={() => setPending(null)}
      />

      <ImpersonateDialog
        intent={viewAs}
        readOnly={viewAsReadOnly}
        busy={busy}
        error={viewAsError}
        onReadOnlyChange={setViewAsReadOnly}
        onConfirm={(reason) => void beginImpersonation(reason)}
        onCancel={() => setViewAs(null)}
      />
    </>
  );
}
