import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { useApp } from "../../../lib/app-context";

export interface CreateOrgDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (orgId: string) => void;
}

export function CreateOrgDialog({ open, onClose, onCreated }: CreateOrgDialogProps) {
  const { api, toast, handleError } = useApp();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { orgId } = await api.org.create({ name: trimmed });
      toast("Organization created", "success");
      setName("");
      onClose();
      onCreated?.(orgId);
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
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>
            Organizations hold your Kytelinks, members, and storage. Invite teammates and share access.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <TextInput
            label="Name"
            placeholder="Acme Studio"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
