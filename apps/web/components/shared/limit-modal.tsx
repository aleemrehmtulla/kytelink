import { getCdnUrl } from "@kytelink/ui";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import {
  FOUNDER_NAME,
  FOUNDER_PHOTO_KEY,
  FOUNDER_TITLE,
  FOUNDER_X_URL,
} from "../../consts/brand";

export interface LimitModalProps {
  open: boolean;
  thing: string | null;
  onClose: () => void;
}

export function LimitModal({ open, thing, onClose }: LimitModalProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={420}>
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          You&apos;ve hit the limit on {thing ?? "this"}.
        </h2>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted p-4">
          <img
            src={getCdnUrl(FOUNDER_PHOTO_KEY)}
            alt={FOUNDER_NAME}
            width={56}
            height={56}
            className="rounded-full object-cover"
          />
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{FOUNDER_NAME}</p>
            <p className="text-xs text-muted-foreground">{FOUNDER_TITLE}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          DM him with your Kytelink username and what you&apos;re building — he&apos;ll raise your
          limit.
        </p>
        <a href={FOUNDER_X_URL} target="_blank" rel="noreferrer" className="w-full">
          <Button block>Message Aleem on X</Button>
        </a>
      </div>
    </Modal>
  );
}
