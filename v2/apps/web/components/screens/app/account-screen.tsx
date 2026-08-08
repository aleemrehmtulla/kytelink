import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Building2, ImagePlus, KeyRound, LogOut, Mail, Plus, Settings } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { AppShell, PageTitle } from "./app-shell";
import { CreateOrgDialog } from "../editor/create-org-dialog";
import { AvatarCropper } from "../../shared/avatar-cropper";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { Badge } from "../../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
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
import type { AccountInfo, OrgSummary, Passkey } from "../../../lib/api/types";

type NamePrompt = { mode: "add" } | { mode: "rename"; passkey: Passkey } | null;

export function AccountScreen() {
  const router = useRouter();
  const { api, session, ready, toast, handleError, signOut, capabilities } = useApp();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [namePrompt, setNamePrompt] = useState<NamePrompt>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [a, { orgs: mine }] = await Promise.all([api.account.get(), api.org.listMine()]);
    setAccount(a);
    setOrgs(mine);
  }, [api]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      void router.replace("/login");
      return;
    }
    void load().catch((error) => handleError(error));
  }, [ready, session, load, router, handleError]);

  async function submitPasskeyName(name: string) {
    if (!namePrompt) return;
    try {
      if (namePrompt.mode === "add") {
        await api.account.passkeys.add({ name });
        toast("Passkey added", "success");
      } else {
        await api.account.passkeys.rename({ id: namePrompt.passkey.id, name });
      }
      setNamePrompt(null);
      await load();
    } catch (error) {
      handleError(error);
    }
  }

  async function removePasskey(id: string) {
    try {
      await api.account.passkeys.remove({ id });
      toast("Passkey removed", "success");
      await load();
    } catch (error) {
      handleError(error);
    }
  }

  function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function saveAvatar(image: string) {
    try {
      await api.account.setAvatar({ image });
      toast("Profile picture updated", "success");
      await load();
    } catch (error) {
      handleError(error);
    }
  }

  async function removeAvatar() {
    setRemovingAvatar(true);
    try {
      await api.account.setAvatar({ image: null });
      toast("Profile picture removed");
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setRemovingAvatar(false);
    }
  }

  if (!account) {
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
        title="Account"
        description="Your sign-in, security, and organizations."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              signOut();
              void router.push("/login");
            }}
          >
            <LogOut />
            Log out
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="flex flex-col p-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-[13px] font-semibold text-ink">Profile picture</h3>
            <p className="text-[13px] text-secondary">
              Shown next to your name across Kytelink. This is for your account only — it doesn&apos;t
              appear on your Kytelinks.
            </p>
          </div>
          <div className="mt-4 flex flex-1 flex-wrap items-center gap-4">
            <Avatar className="size-16">
              {account.image ? <AvatarImage src={account.image} alt="" /> : null}
              <AvatarFallback className="text-lg">
                {account.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {capabilities.uploads ? (
              <div className="flex flex-wrap gap-2">
                <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickAvatar} />
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-input"
                  onClick={() => fileInput.current?.click()}
                >
                  <ImagePlus />
                  {account.image ? "Change photo" : "Upload photo"}
                </Button>
                {account.image ? (
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    onClick={() => void removeAvatar()}
                    loading={removingAvatar}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-[13px] text-tertiary">Photo uploads are disabled on this instance.</p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-[13px] font-semibold text-ink">Email</h3>
            <p className="text-[13px] text-secondary">Used to sign in and receive account notices.</p>
          </div>
          <div className="mt-4 flex flex-1 flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-ink">
              <Mail className="size-4 text-tertiary" />
              {account.email}
            </span>
            <Button variant="secondary" size="sm" className="rounded-input" onClick={() => setEmailOpen(true)}>
              Change email
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-[13px] font-semibold text-ink">Organizations</h3>
              <p className="text-[13px] text-secondary">Each holds Kytelinks, members, and storage.</p>
            </div>
            <Button variant="secondary" size="sm" className="rounded-input" onClick={() => setCreateOrgOpen(true)}>
              <Building2 />
              New
            </Button>
          </div>
          <div className="mt-4 overflow-hidden rounded-input border border-cardline">
            {orgs.map((org, index) => (
              <div
                key={org.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${index > 0 ? "border-t border-hairline" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">
                    {org.name}
                  </span>
                  <Badge variant={org.personal ? "neutral" : "outline"}>
                    {org.personal ? "default" : org.role.toLowerCase()}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/orgs/${org.id}/settings`}>
                    <Settings />
                    Settings
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-[13px] font-semibold text-ink">Passkeys</h3>
              <p className="text-[13px] text-secondary">Sign in instantly with Face ID, Touch ID, or a security key.</p>
            </div>
            <Button variant="secondary" size="sm" className="rounded-input" onClick={() => setNamePrompt({ mode: "add" })}>
              <Plus />
              Add
            </Button>
          </div>
          <div className="mt-4">
            {account.passkeys.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-input border border-cardline py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-tint text-tertiary">
                  <KeyRound className="size-5" />
                </span>
                <p className="text-[13px] text-secondary">No passkeys yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-input border border-cardline">
                {account.passkeys.map((passkey, index) => (
                  <div
                    key={passkey.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${index > 0 ? "border-t border-hairline" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{passkey.name}</p>
                      <p className="text-xs text-faint">
                        Added {new Date(passkey.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setNamePrompt({ mode: "rename", passkey })}>
                        Rename
                      </Button>
                      <Button variant="danger-ghost" size="sm" onClick={() => void removePasskey(passkey.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <AvatarCropper
        open={cropSrc !== null}
        imageSrc={cropSrc}
        kyteId="onboarding"
        onClose={() => setCropSrc(null)}
        onComplete={(result) => void saveAvatar(result.url)}
      />
      <CreateOrgDialog open={createOrgOpen} onClose={() => setCreateOrgOpen(false)} onCreated={() => void load()} />
      <ChangeEmailDialog open={emailOpen} onClose={() => setEmailOpen(false)} onChanged={load} />
      <NamePromptDialog
        prompt={namePrompt}
        onClose={() => setNamePrompt(null)}
        onSubmit={submitPasskeyName}
      />
    </AppShell>
  );
}

function ChangeEmailDialog({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const { api, toast, handleError } = useApp();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!email.includes("@")) return;
    setSaving(true);
    try {
      const result = await api.account.changeEmail({ newEmail: email.trim() });
      toast(result.otpSent ? "Check your new inbox to confirm" : "Email updated", "success");
      setEmail("");
      onClose();
      onChanged();
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent showClose={false}>
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
          <DialogDescription>We'll send a confirmation to the new address.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <TextInput
            type="email"
            label="New email"
            placeholder="you@email.com"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!email.includes("@")}>
            Send confirmation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NamePromptDialog({
  prompt,
  onClose,
  onSubmit,
}: {
  prompt: NamePrompt;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const isRename = prompt?.mode === "rename";
  const [name, setName] = useState(isRename ? prompt.passkey.name : "");
  const open = prompt !== null;

  useEffect(() => {
    setName(prompt?.mode === "rename" ? prompt.passkey.name : "");
  }, [prompt]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent showClose={false}>
        <DialogHeader>
          <DialogTitle>{isRename ? "Rename passkey" : "Add a passkey"}</DialogTitle>
          <DialogDescription>
            {isRename ? "Give this passkey a recognizable name." : "Name this device, then approve the prompt."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <TextInput
            label="Name"
            placeholder="MacBook Pro"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onSubmit(name.trim())}
          />
        </DialogBody>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setName("");
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button disabled={!name.trim()} onClick={() => onSubmit(name.trim())}>
            {isRename ? "Save" : "Add passkey"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
