import { useRef, useState } from "react";
import { Import, PartyPopper, Plus, X } from "lucide-react";
import type { Link, ProfileContent } from "@kytelink/schemas";
import { prefixHttps, safeWebUrlSchema } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { ImportPanel } from "../../shared/import-panel";

export interface StarterLinksStepProps {
  draft: ProfileContent;
  publishing: boolean;
  publishError: string | null;
  onAddLinks: (links: Link[], meta: { displayName?: string; description?: string }) => void;
  onRemoveLink: (index: number) => void;
  onPublish: (extraLinks: Link[]) => void;
}

export function StarterLinksStep({
  draft,
  publishing,
  publishError,
  onAddLinks,
  onRemoveLink,
  onPublish,
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
  const canPublish = linkCount > 0 && !publishing;

  function formRow(): Link {
    return { title: title.trim(), link: prefixHttps(url.trim()) };
  }

  function commitForm() {
    if (!formValid) return;
    onAddLinks([formRow()], {});
    setTitle("");
    setUrl("");
    titleInput.current?.focus();
  }

  function publishNow() {
    if (!canPublish) return;
    onPublish(formValid ? [formRow()] : []);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Add your links</h1>
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
            if (formEmpty && draft.links.length > 0) publishNow();
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
            else if (formEmpty && draft.links.length > 0) publishNow();
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
        {publishError ? (
          <p className="text-center text-[13px] text-danger animate-in fade-in duration-200">
            {publishError}
          </p>
        ) : null}
        <Button
          variant="accent"
          block
          size="lg"
          loading={publishing}
          disabled={linkCount === 0}
          onClick={publishNow}
        >
          <PartyPopper /> Go live
        </Button>
        <p className="text-center text-xs text-faint">
          {linkCount === 0
            ? "Add at least one link to publish your page."
            : `${linkCount} link${linkCount === 1 ? "" : "s"} ready to publish.`}
        </p>
      </div>

      <div className="flex flex-col border-t border-hairline pt-4">
        {importOpen ? (
          <ImportPanel onImport={onAddLinks} />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="self-center gap-1.5 px-2 text-[13px] text-tertiary not-disabled:hover:text-ink"
          >
            <Import className="size-3.5" /> Import from Linktree, Beacons or Bio.link
          </Button>
        )}
      </div>
    </div>
  );
}
