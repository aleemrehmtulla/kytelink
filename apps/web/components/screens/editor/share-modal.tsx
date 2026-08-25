import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Globe } from "lucide-react";
import { FaXTwitter, FaWhatsapp, FaLinkedinIn, FaRegEnvelope } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { Modal } from "../../ui/modal";
import { Button } from "../../ui/button";
import { cn } from "@/lib/cn";
import { SHARE_DOMAINS } from "../../../consts/brand";
import { buildShareTargets, profileUrl, type ShareDomain } from "../../../lib/share";
import { useCopied } from "../../../hooks/use-copied";

export interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  displayName?: string | null;
}

const SHARE_BUTTONS: { key: keyof ReturnType<typeof buildShareTargets>; label: string; Icon: IconType }[] = [
  { key: "twitter", label: "Twitter", Icon: FaXTwitter },
  { key: "whatsapp", label: "WhatsApp", Icon: FaWhatsapp },
  { key: "linkedin", label: "LinkedIn", Icon: FaLinkedinIn },
  { key: "email", label: "Email", Icon: FaRegEnvelope },
];

export function ShareModal({ open, onClose, username, displayName = null }: ShareModalProps) {
  const [domain, setDomain] = useState<ShareDomain>(SHARE_DOMAINS[0]);
  const { copied, copy } = useCopied(1500);

  const url = useMemo(() => profileUrl(domain, username), [domain, username]);
  const targets = useMemo(() => buildShareTargets(url, displayName), [url, displayName]);

  return (
    <Modal open={open} onClose={onClose} title="Share your Kytelink" maxWidth={480}>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">Domain</div>
          <div className="inline-flex rounded-pill border border-border bg-tint p-1">
            {SHARE_DOMAINS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDomain(d)}
                aria-pressed={domain === d}
                className={cn(
                  "rounded-pill px-3.5 py-1.5 text-sm font-medium outline-none transition-colors",
                  domain === d
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">Profile link</div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-1.5 pl-3">
            <input
              readOnly
              value={url}
              data-testid="share-url"
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
            />
            <Button size="sm" variant={copied ? "secondary" : "primary"} onClick={() => void copy(url)}>
              {copied ? <Check /> : <Copy />}
              <span className="grid">
                <span className={cn("col-start-1 row-start-1", copied && "invisible")}>Copy</span>
                <span className={cn("col-start-1 row-start-1", !copied && "invisible")}>Copied</span>
              </span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">Share to</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SHARE_BUTTONS.map(({ key, label, Icon }) => (
              <a
                key={key}
                href={targets[key]}
                target="_blank"
                rel="noreferrer"
                data-testid={`share-${key}`}
                className="flex h-16 flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted"
              >
                <Icon className="size-5" />
                {label}
              </a>
            ))}
          </div>
        </div>

        <Link
          href="/edit/settings"
          onClick={onClose}
          data-testid="share-custom-domain"
          className="flex items-center gap-3 rounded-card border border-accent-border bg-accent-soft px-3.5 py-3 text-sm transition-colors hover:bg-accent-soft/70"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-input bg-card text-accent">
            <Globe className="size-4" />
          </span>
          <span className="flex-1">
            <span className="block font-medium text-foreground">Use your own domain</span>
            <span className="block text-xs text-muted-foreground">Point a custom domain at your Kytelink</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-accent" />
        </Link>
      </div>
    </Modal>
  );
}
