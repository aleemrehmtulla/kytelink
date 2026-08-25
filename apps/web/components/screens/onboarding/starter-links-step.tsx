import { useRef, useState } from "react";
import { PartyPopper, Plus, X } from "lucide-react";
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

interface Row {
  title: string;
  link: string;
}

const MAX_ROWS = 8;

function rowComplete(row: Row): boolean {
  return (
    row.title.trim().length > 0 &&
    safeWebUrlSchema.safeParse(prefixHttps(row.link.trim())).success
  );
}

export function StarterLinksStep({
  draft,
  publishing,
  publishError,
  onAddLinks,
  onRemoveLink,
  onPublish,
}: StarterLinksStepProps) {
  const [rows, setRows] = useState<Row[]>([
    { title: "", link: "" },
    { title: "", link: "" },
  ]);
  const titleRefs = useRef<(HTMLInputElement | null)[]>([]);
  const linkRefs = useRef<(HTMLInputElement | null)[]>([]);

  const completeRows = rows.filter(rowComplete);
  const linkCount = draft.links.length + completeRows.length;
  const canPublish = linkCount > 0 && !publishing;

  function updateRow(index: number, partial: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...partial } : row)));
  }

  function addRow() {
    setRows((current) =>
      current.length < MAX_ROWS ? [...current, { title: "", link: "" }] : current,
    );
  }

  function publishNow() {
    if (!canPublish) return;
    onPublish(
      completeRows.map((row) => ({
        title: row.title.trim(),
        link: prefixHttps(row.link.trim()),
      })),
    );
  }

  function onLinkKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (canPublish) {
      publishNow();
    } else {
      const nextTitle = titleRefs.current[index + 1];
      if (nextTitle) nextTitle.focus();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Add your first link</h1>
        <p className="mt-1.5 text-sm text-secondary">
          Pages with at least one link get way more visits. You can add more anytime.
        </p>
      </div>

      <ImportPanel onImport={onAddLinks} />

      {draft.links.length > 0 ? (
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto overscroll-contain">
          {draft.links.map((link, index) => (
            <div
              key={`${link.link}-${index}`}
              className="flex items-center gap-3 rounded-input border border-success/40 bg-card px-3 py-2 text-sm animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              <span className="min-w-0 truncate font-medium text-ink">{link.title}</span>
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

      <div className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const complete = rowComplete(row);
          return (
            <div key={index} className="flex flex-col gap-2 sm:flex-row">
              <TextInput
                ref={(el) => {
                  titleRefs.current[index] = el;
                }}
                placeholder="Title — e.g. My website"
                value={row.title}
                autoFocus={index === 0}
                onChange={(event) => updateRow(index, { title: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    linkRefs.current[index]?.focus();
                  }
                }}
              />
              <TextInput
                ref={(el) => {
                  linkRefs.current[index] = el;
                }}
                placeholder="https://…"
                value={row.link}
                status={complete ? "valid" : "default"}
                onChange={(event) => updateRow(index, { link: event.target.value })}
                onKeyDown={(event) => onLinkKeyDown(event, index)}
              />
            </div>
          );
        })}
        {rows.length < MAX_ROWS ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={addRow}
            className="-mt-1 self-start gap-1 px-2 text-[13px] text-tertiary not-disabled:hover:text-ink"
          >
            <Plus className="size-3.5" /> Add another
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-3">
        {publishError ? (
          <p className="text-center text-[13px] text-danger animate-in fade-in duration-300">
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
    </div>
  );
}
