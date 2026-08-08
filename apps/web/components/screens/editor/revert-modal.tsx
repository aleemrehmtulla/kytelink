import { useState } from "react";
import { Modal } from "../../ui/modal";
import { Button } from "../../ui/button";
import { useEditor } from "../../../lib/editor/editor-context";

export interface RevertModalProps {
  open: boolean;
  onClose: () => void;
}

export function RevertModal({ open, onClose }: RevertModalProps) {
  const { revertToPublished } = useEditor();
  const [reverting, setReverting] = useState(false);

  async function revert() {
    setReverting(true);
    try {
      await revertToPublished();
      onClose();
    } finally {
      setReverting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revert to published?"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={reverting} onClick={() => void revert()}>
            Revert draft
          </Button>
        </div>
      }
    >
      <p className="text-muted-foreground text-sm">
        Your draft goes back to exactly what&apos;s live right now. Every unpublished
        change is discarded — this can&apos;t be undone.
      </p>
    </Modal>
  );
}
