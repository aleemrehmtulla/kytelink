import { copyText } from "./clipboard";
import { useToast } from "./toast";

export interface CopyIdProps {
  value: string;
  label?: string;
}

function CopyGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CopyId({ value, label }: CopyIdProps) {
  const { toast } = useToast();
  const noun = label ?? "ID";

  async function copy() {
    const ok = await copyText(value);
    toast(ok ? `${noun} copied` : `Couldn't copy the ${noun.toLowerCase()}`, {
      tone: ok ? "success" : "danger",
    });
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={value}
      aria-label={`Copy ${noun}: ${value}`}
      className="rounded-pill bg-tint text-secondary hover:bg-tint-hover hover:text-ink inline-flex min-w-0 max-w-[min(190px,100%)] cursor-pointer items-center gap-1.5 px-2.5 py-1 text-[11px]"
    >
      {label ? <span className="text-tertiary shrink-0">{label}</span> : null}
      <span className="min-w-0 truncate font-mono">{value}</span>
      <span className="text-faint shrink-0">
        <CopyGlyph />
      </span>
    </button>
  );
}
