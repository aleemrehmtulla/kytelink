import { copyText } from "../../ui/clipboard";
import { useToast } from "../../ui/toast";

export interface CopyMessageProps {
  text: string;
}

export function CopyMessage({ text }: CopyMessageProps) {
  const { toast } = useToast();

  async function copy() {
    const copied = await copyText(text);
    if (copied) toast("Alert message copied.", { tone: "success" });
    else toast("Couldn't copy — select the text instead.", { tone: "danger" });
  }

  return (
    <button
      type="button"
      aria-label="Copy alert message"
      title="Copy alert message"
      onClick={() => void copy()}
      className="rounded-input text-faint hover:bg-tint hover:text-ink shrink-0 cursor-pointer p-1"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
    </button>
  );
}
