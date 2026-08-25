import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Check, PartyPopper } from "lucide-react";
import { Button } from "../../ui/button";
import { publicWebUrl } from "../../../lib/env";

export interface GoLiveStepProps {
  username: string;
}

export function GoLiveStep({ username }: GoLiveStepProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = `kytelink.com/${username}`;

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  function copy() {
    void navigator.clipboard.writeText(`https://${url}`);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  const shareText = encodeURIComponent(`Check out my Kytelink: https://${url}`);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent animate-in zoom-in duration-300">
        <PartyPopper className="size-8" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">You&apos;re live!</h1>
        <p className="mt-1.5 text-sm text-secondary">Your page is published and ready to share.</p>
      </div>

      <button
        type="button"
        onClick={copy}
        className={`w-full cursor-pointer rounded-input border bg-tint px-4 py-4 text-base font-semibold text-ink transition-colors ${
          copied ? "border-success" : "border-border hover:border-ink"
        }`}
      >
        {url}
        {copied ? (
          <span className="ml-2 inline-flex items-center gap-1 text-sm font-normal text-success">
            <Check className="size-4" /> Copied
          </span>
        ) : (
          <span className="ml-2 text-sm font-normal text-accent">Copy</span>
        )}
      </button>

      <div className="flex flex-wrap justify-center gap-2">
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-pill border border-border px-4 py-2 text-sm text-secondary transition-colors hover:bg-tint hover:text-ink"
        >
          Share on X
        </a>
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-pill border border-border px-4 py-2 text-sm text-secondary transition-colors hover:bg-tint hover:text-ink"
        >
          WhatsApp
        </a>
        <a
          href={`${publicWebUrl()}/${username}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-pill border border-border px-4 py-2 text-sm text-secondary transition-colors hover:bg-tint hover:text-ink"
        >
          View page
        </a>
      </div>

      <Button variant="accent" block size="lg" onClick={() => router.push("/edit")}>
        Open editor
      </Button>
    </div>
  );
}
