import { copyText } from "../../ui/clipboard";
import { useToast } from "../../ui/toast";
import type { ModerationSignal } from "../../../lib/admin-source";
import { isHttpUrl, truncate } from "./moderation-text";

const EVIDENCE_MAX = 44;
const URL_MAX = 52;

export interface CopyableUrlProps {
  value: string;
  max?: number;
  openLabel?: string;
}

export function CopyableUrl({ value, max = URL_MAX, openLabel }: CopyableUrlProps) {
  const { toast } = useToast();

  async function copy() {
    const ok = await copyText(value);
    toast(ok ? "URL copied." : "Couldn't copy that URL.", { tone: ok ? "success" : "danger" });
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <button
        type="button"
        onClick={() => void copy()}
        title={value}
        aria-label={`Copy ${value}`}
        className="cursor-pointer truncate rounded-input bg-tint px-2 py-0.5 font-mono text-[12px] text-secondary hover:bg-tint-hover"
      >
        {truncate(value, max)}
      </button>
      {isHttpUrl(value) ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={openLabel ?? `Open ${value} in a new tab`}
          title={openLabel ?? "Open in a new tab"}
          className="shrink-0 cursor-pointer text-[12px] font-medium text-accent hover:text-accent-hover"
        >
          Open ↗
        </a>
      ) : null}
    </span>
  );
}

export interface SignalPillsProps {
  signals: ModerationSignal[];
}

export function SignalPills({ signals }: SignalPillsProps) {
  const { toast } = useToast();

  async function copy(value: string) {
    const ok = await copyText(value);
    toast(ok ? "Evidence copied." : "Couldn't copy that evidence.", {
      tone: ok ? "success" : "danger",
    });
  }

  if (signals.length === 0) {
    return <span className="text-[12px] text-faint">No signals tripped</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {signals.map((signal) => {
        const body = (
          <>
            <span className="font-medium">{signal.label}</span>
            <span className="text-warning/80">{truncate(signal.evidence, EVIDENCE_MAX)}</span>
          </>
        );
        const shell =
          "inline-flex max-w-full items-center gap-1.5 rounded-pill bg-warning-soft px-2.5 py-0.5 text-left text-[12px] text-warning";
        return isHttpUrl(signal.evidence) ? (
          <button
            key={signal.key}
            type="button"
            onClick={() => void copy(signal.evidence)}
            title={signal.evidence}
            aria-label={`Copy evidence for ${signal.label}: ${signal.evidence}`}
            className={`${shell} cursor-pointer hover:bg-warning-border/50`}
          >
            {body}
          </button>
        ) : (
          <span key={signal.key} title={signal.evidence} className={shell}>
            {body}
          </span>
        );
      })}
    </div>
  );
}
