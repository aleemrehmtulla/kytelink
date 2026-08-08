import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { emptyProfileContent, prefixHttps, type Link } from "@kytelink/schemas";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { Spinner } from "../../ui/spinner";
import { useUsernameAvailability } from "../../../hooks/use-username-availability";
import { useApp } from "../../../lib/app-context";

export interface CreateKyteDialogProps {
  orgId: string | null;
  onClose: () => void;
  onCreated: (kyteId: string) => void;
}

interface LinkRow {
  title: string;
  link: string;
}

export function CreateKyteDialog({ orgId, onClose, onCreated }: CreateKyteDialogProps) {
  const { api, handleError } = useApp();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [rows, setRows] = useState<LinkRow[]>([{ title: "", link: "" }]);
  const [saving, setSaving] = useState(false);
  const availability = useUsernameAvailability(username);

  const open = orgId !== null;
  const trimmedName = name.trim();
  const trimmedUsername = username.trim();
  const usernameOk = availability.status === "available";
  const canSubmit = trimmedName.length > 0 && usernameOk && !saving;

  function reset() {
    setName("");
    setUsername("");
    setRows([{ title: "", link: "" }]);
  }

  function updateRow(index: number, partial: Partial<LinkRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...partial } : row)));
  }

  function close() {
    if (saving) return;
    reset();
    onClose();
  }

  async function submit() {
    if (!orgId || !canSubmit) return;
    setSaving(true);
    try {
      const { kyteId } = await api.kyte.create({ orgId, username: trimmedUsername.toLowerCase() });
      const links: Link[] = rows
        .filter((row) => row.title.trim().length > 0 && row.link.trim().length > 0)
        .map((row) => ({ title: row.title.trim(), link: prefixHttps(row.link.trim()) }));
      const fresh = await api.kyte.get({ kyteId });
      await api.kyte.updateDraft({
        kyteId,
        content: { ...emptyProfileContent(), displayName: trimmedName, links },
        baseUpdatedAt: fresh.updatedAt,
      });
      reset();
      onCreated(kyteId);
    } catch (error) {
      handleError(error, "Couldn't create your Kytelink");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent showClose={false} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Kytelink</DialogTitle>
          <DialogDescription>
            Give it a name and claim your link. You can add and change everything later.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <TextInput
            label="Name"
            placeholder="Logan Green"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
          <TextInput
            label="Link"
            placeholder="logan"
            value={username}
            leftAddon="kytelink.com/"
            status={
              trimmedUsername.length === 0
                ? "default"
                : availability.status === "available"
                  ? "valid"
                  : availability.status === "unavailable"
                    ? "invalid"
                    : "default"
            }
            rightAddon={
              availability.status === "checking" ? (
                <Spinner size={16} />
              ) : availability.status === "available" ? (
                <Check className="size-4 text-success" />
              ) : null
            }
            error={trimmedUsername.length > 0 ? availability.reason : null}
            hint={trimmedUsername.length === 0 ? "Required — every Kytelink needs an address." : undefined}
            onChange={(event) => setUsername(event.target.value)}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Starter links</span>
            {rows.map((row, index) => (
              <div key={index} className="flex flex-col gap-2 sm:flex-row">
                <TextInput
                  placeholder="Title"
                  value={row.title}
                  onChange={(event) => updateRow(index, { title: event.target.value })}
                />
                <TextInput
                  placeholder="https://…"
                  value={row.link}
                  onChange={(event) => updateRow(index, { link: event.target.value })}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRows((current) => [...current, { title: "", link: "" }])}
              className="flex items-center gap-1.5 self-start text-[13px] font-medium text-accent transition-colors hover:text-ink"
            >
              <Plus className="size-4" />
              Add another link
            </button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!canSubmit}>
            Create Kytelink
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
