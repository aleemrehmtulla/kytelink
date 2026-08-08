import { useState } from "react";
import type { KyteAccess, Role } from "@kytelink/schemas";
import { useApp } from "../../../lib/app-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { ROLE_DESCRIPTIONS, INVITABLE_ROLE_LIST } from "../../../consts/roles";
import { cn } from "@/lib/cn";
import type { KyteSummary, Member } from "../../../lib/api/types";

export interface MemberRoleDialogProps {
  open: boolean;
  member: Member | null;
  orgId: string;
  orgKytes: KyteSummary[];
  onClose: () => void;
  onSaved: () => void;
}

function roleLabel(role: Role): string {
  return role[0] + role.slice(1).toLowerCase();
}

export function MemberRoleDialog({ open, member, orgId, orgKytes, onClose, onSaved }: MemberRoleDialogProps) {
  const { api, toast, handleError } = useApp();
  const [role, setRole] = useState<Role>(member?.role ?? "EDITOR");
  const [access, setAccess] = useState<KyteAccess>(member?.kyteAccess ?? "ALL");
  const [grants, setGrants] = useState<Record<string, Role>>(
    Object.fromEntries((member?.kyteGrants ?? []).map((grant) => [grant.kyteId, grant.role])),
  );
  const [saving, setSaving] = useState(false);

  if (!member) return null;

  async function save() {
    if (!member) return;
    setSaving(true);
    try {
      await api.team.updateAccess({
        orgId,
        membershipId: member.membershipId,
        role,
        kyteAccess: access,
        kyteGrants:
          access === "SELECTED"
            ? Object.entries(grants).map(([kyteId, grantRole]) => ({ kyteId, role: grantRole }))
            : undefined,
      });
      toast("Access updated", "success");
      onSaved();
      onClose();
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }

  async function removeMember() {
    if (!member) return;
    try {
      await api.team.removeMember({ orgId, membershipId: member.membershipId });
      toast("Member removed", "success");
      onSaved();
      onClose();
    } catch (error) {
      handleError(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member.email}</DialogTitle>
          <DialogDescription>Choose what this teammate can do in the organization.</DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Role</p>
            <div className="flex flex-col gap-2">
              {INVITABLE_ROLE_LIST.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-input border p-3 transition-colors",
                    role === option ? "border-accent bg-accent-soft" : "border-cardline hover:bg-tint",
                  )}
                >
                  <input
                    type="radio"
                    checked={role === option}
                    onChange={() => setRole(option)}
                    className="mt-0.5 accent-accent outline-none"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-ink">{roleLabel(option)}</span>
                    <span className="text-xs text-secondary">{ROLE_DESCRIPTIONS[option]}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {role !== "ADMIN" ? (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Which Kytelinks</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAccess("ALL")}
                  className={cn(
                    "flex-1 rounded-input border px-3 py-2 text-sm outline-none transition-colors",
                    access === "ALL" ? "border-accent bg-accent-soft text-ink" : "border-cardline text-ink hover:bg-tint",
                  )}
                >
                  All Kytelinks
                </button>
                <button
                  type="button"
                  onClick={() => setAccess("SELECTED")}
                  className={cn(
                    "flex-1 rounded-input border px-3 py-2 text-sm outline-none transition-colors",
                    access === "SELECTED" ? "border-accent bg-accent-soft text-ink" : "border-cardline text-ink hover:bg-tint",
                  )}
                >
                  Selected
                </button>
              </div>

              {access === "SELECTED" ? (
                <div className="mt-3 flex flex-col gap-2">
                  {orgKytes.map((kyte) => (
                    <div key={kyte.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-ink">{kyte.displayName || kyte.username}</span>
                      <Select
                        value={grants[kyte.id] ?? "none"}
                        onValueChange={(value) =>
                          setGrants((current) => {
                            const next = { ...current };
                            if (value !== "none") next[kyte.id] = value as Role;
                            else delete next[kyte.id];
                            return next;
                          })
                        }
                      >
                        <SelectTrigger className="h-9 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No access</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="EDITOR">Editor</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter className="justify-between">
          <Button variant="danger-ghost" size="sm" onClick={removeMember}>
            Remove from team
          </Button>
          <Button variant="primary" className="rounded-input" onClick={save} loading={saving}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
