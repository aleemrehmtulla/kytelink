import { useRouter } from "next/router";
import { Check, Copy, ExternalLink, PartyPopper } from "lucide-react";
import { Button } from "../../ui/button";
import { useCopied } from "../../../hooks/use-copied";
import { publicWebUrl } from "../../../lib/env";

export interface GoLiveStepProps {
  username: string;
}

export function GoLiveStep({ username }: GoLiveStepProps) {
  const router = useRouter();
  const { copied, copy } = useCopied();
  const url = `kytelink.com/${username}`;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent animate-in zoom-in duration-300">
        <PartyPopper className="size-8" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">You&apos;re live!</h1>
        <p className="mt-1.5 text-sm text-secondary">
          This link is yours now — put it everywhere.
        </p>
      </div>

      <div className="flex w-full items-center gap-2 rounded-input border border-border bg-tint py-2.5 pl-4 pr-2">
        <span className="min-w-0 flex-1 truncate text-left text-base font-semibold text-ink">
          {url}
        </span>
        <button
          type="button"
          onClick={() => void copy(`https://${url}`)}
          aria-label="Copy link"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-pill text-secondary transition-colors hover:bg-card hover:text-ink"
        >
          <span className="relative size-4" aria-hidden>
            <Copy
              className={`absolute inset-0 size-4 transition-all duration-200 ${
                copied ? "scale-50 opacity-0" : "scale-100 opacity-100"
              }`}
            />
            <Check
              className={`absolute inset-0 size-4 text-success transition-all duration-200 ${
                copied ? "scale-100 opacity-100" : "scale-50 opacity-0"
              }`}
            />
          </span>
        </button>
        <a
          href={`${publicWebUrl()}/${username}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Open your page"
          className="flex size-9 shrink-0 items-center justify-center rounded-pill text-secondary transition-colors hover:bg-card hover:text-ink"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      <Button variant="accent" block size="lg" onClick={() => router.push("/edit")}>
        Open editor
      </Button>
    </div>
  );
}
