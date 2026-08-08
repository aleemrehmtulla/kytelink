import { useRouter } from "next/router";
import { PartyPopper } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { Button } from "../../ui/button";
import { publicWebUrl } from "../../../lib/env";

export interface GoLiveStepProps {
  username: string;
}

export function GoLiveStep({ username }: GoLiveStepProps) {
  const router = useRouter();
  const { toast } = useApp();
  const url = `kytelink.com/${username}`;

  function copy() {
    void navigator.clipboard.writeText(`https://${url}`);
    toast("Link copied", "success");
  }

  const shareText = encodeURIComponent(`Check out my Kytelink: https://${url}`);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
        <PartyPopper className="size-8" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">You&apos;re live!</h1>
        <p className="mt-1.5 text-sm text-secondary">Your page is published and ready to share.</p>
      </div>

      <button
        type="button"
        onClick={copy}
        className="w-full rounded-input border border-border bg-tint px-4 py-4 text-base font-semibold text-ink transition-colors hover:border-ink"
      >
        {url}
        <span className="ml-2 text-sm font-normal text-accent">Copy</span>
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
