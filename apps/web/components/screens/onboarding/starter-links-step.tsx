import { useRef, useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import type { Link, ProfileContent } from "@kytelink/schemas";
import { prefixHttps, safeWebUrlSchema } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { ImportPanel } from "../../shared/import-panel";

export interface StarterLinksStepProps {
  draft: ProfileContent;
  onAddLinks: (links: Link[], meta: { displayName?: string; description?: string }) => void;
  onRemoveLink: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StarterLinksStep({
  draft,
  onAddLinks,
  onRemoveLink,
  onNext,
  onBack,
}: StarterLinksStepProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);

  const formValid =
    title.trim().length > 0 && safeWebUrlSchema.safeParse(prefixHttps(url.trim())).success;
  const formEmpty = title.trim().length === 0 && url.trim().length === 0;
  const linkCount = draft.links.length + (formValid ? 1 : 0);

  function commitForm() {
    if (!formValid) return;
    onAddLinks([{ title: title.trim(), link: prefixHttps(url.trim()) }], {});
    setTitle("");
    setUrl("");
    titleInput.current?.focus();
  }

  function continueNow() {
    if (linkCount === 0) return;
    commitForm();
    onNext();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-2 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-pill text-tertiary transition-colors hover:bg-tint hover:text-ink"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Add your links</h1>
        </div>
        <p className="mt-1.5 text-sm text-secondary">
          Your page needs at least one — most people start with two or three.
        </p>
      </div>

      {draft.links.length > 0 ? (
        <div className="flex max-h-52 flex-col gap-2 overflow-y-auto overscroll-contain">
          {draft.links.map((link, index) => (
            <div
              key={`${link.link}-${index}`}
              className="flex h-11 shrink-0 items-center gap-3 rounded-input border border-cardline bg-card px-3.5 animate-in fade-in duration-200"
            >
              <span className="min-w-0 max-w-[45%] truncate text-sm font-medium text-ink">
                {link.title}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-faint">{link.link}</span>
              <button
                type="button"
                aria-label={`Remove ${link.title}`}
                onClick={() => onRemoveLink(index)}
                className="shrink-0 cursor-pointer rounded-pill p-1 text-tertiary transition-colors hover:bg-tint hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3.5">
        <TextInput
          ref={titleInput}
          label="Title"
          placeholder="My website"
          value={title}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (formEmpty && draft.links.length > 0) continueNow();
            else urlInput.current?.focus();
          }}
        />
        <TextInput
          ref={urlInput}
          label="URL"
          placeholder="https://…"
          value={url}
          status={formValid ? "valid" : "default"}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (formValid) commitForm();
            else if (formEmpty && draft.links.length > 0) continueNow();
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={!formValid}
          onClick={commitForm}
          className="self-end"
        >
          <Plus className="size-3.5" /> Add link
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="accent"
          block
          size="lg"
          disabled={linkCount === 0}
          onClick={continueNow}
        >
          Continue
          <kbd className="flex h-5 items-center rounded-[5px] bg-white/20 px-1.5 font-sans text-[12px] font-medium">
            ↵
          </kbd>
        </Button>
        <p className="text-center text-xs text-faint">
          {linkCount === 0
            ? "Add at least one link to continue."
            : `${linkCount} link${linkCount === 1 ? "" : "s"} ready.`}
        </p>
      </div>

      <div className="flex flex-col border-t border-hairline pt-4">
        {importOpen ? (
          <ImportPanel onImport={onAddLinks} onClose={() => setImportOpen(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="cursor-pointer self-center text-[13px] text-tertiary transition-colors hover:text-ink"
          >
            Already on Linktree, Beacons or Bio.link?{" "}
            <span className="underline underline-offset-2">Import your links</span>
          </button>
        )}
      </div>
    </div>
  );
}
