import { FaXTwitter } from "react-icons/fa6";
import { getCdnUrl } from "@kytelink/ui";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { FOUNDER_NAME, FOUNDER_PHOTO_KEY, FOUNDER_X_URL } from "../../consts/brand";

export interface FounderSupportModalProps {
  open: boolean;
  onClose: () => void;
}

const FOUNDER_FIRST_NAME = FOUNDER_NAME.split(" ")[0];

export function FounderSupportModal({ open, onClose }: FounderSupportModalProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={500}>
      <div className="flex flex-col items-center gap-5 px-2 py-4 text-center">
        <img
          src={getCdnUrl(FOUNDER_PHOTO_KEY)}
          alt={FOUNDER_NAME}
          width={104}
          height={104}
          className="border-cardline size-26 rounded-full border object-cover"
        />
        <h2 className="text-foreground text-xl font-semibold">
          Hey, I&apos;m {FOUNDER_FIRST_NAME} <span aria-hidden="true">👋</span>
        </h2>
        <p className="text-muted-foreground text-[0.95rem] leading-relaxed">
          I built and host Kytelink myself as a free, open-source passion project. There&apos;s no
          support team, it&apos;s just me. If you have questions, concerns, or ideas, hit me up on
          Twitter :)
        </p>
        <div className="flex w-full flex-col items-center gap-2 pt-1">
          <a href={FOUNDER_X_URL} target="_blank" rel="noreferrer" className="w-full">
            <Button variant="accent" size="lg" block onClick={onClose}>
              <FaXTwitter />
              Message me on Twitter
            </Button>
          </a>
          <Button variant="ghost" onClick={onClose}>
            Maybe later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
