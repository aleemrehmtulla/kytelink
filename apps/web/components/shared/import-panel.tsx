import { useState } from "react";
import { Check } from "lucide-react";
import type { ImportProposal, Link } from "@kytelink/schemas";
import { useApp } from "../../lib/app-context";
import { sendEventBeacon } from "../../lib/beacons";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";

function importSource(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export interface ImportPanelProps {
  onImport: (links: Link[], meta: { displayName?: string; description?: string }) => void;
}

export function ImportPanel({ onImport }: ImportPanelProps) {
  const { api } = useApp();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<ImportProposal | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  async function onFetch() {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setImportedCount(null);
    try {
      const result = await api.import.fromUrl({ url });
      if (result.links.length === 0) {
        setProposal(null);
        setError("We couldn't find any links on that page — double-check the URL.");
      } else {
        setProposal(result);
        setSelected(new Set(result.links.map((_, index) => index)));
      }
    } catch {
      setProposal(null);
      setError("We couldn't read that page — double-check the URL.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(index: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function confirm() {
    if (!proposal) return;
    const links = proposal.links.filter((_, index) => selected.has(index));
    onImport(links, { displayName: proposal.displayName, description: proposal.description });
    sendEventBeacon("links_imported", { source: importSource(url), count: links.length });
    setProposal(null);
    setUrl("");
    setImportedCount(links.length);
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-cardline bg-card p-5">
      <div>
        <h3 className="text-[13px] font-semibold text-ink">
          Already have a link-in-bio? Bring it over
        </h3>
        <p className="mt-1 text-[13px] text-secondary">
          Paste a Linktree, Beacons or Bio.link URL.
        </p>
      </div>
      <div className="flex gap-2">
        <TextInput
          placeholder="https://linktr.ee/you"
          value={url}
          status={error ? "invalid" : "default"}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
            setImportedCount(null);
          }}
          onKeyDown={(event) => event.key === "Enter" && onFetch()}
        />
        <Button onClick={onFetch} loading={loading} variant="secondary" className="shrink-0">
          Fetch
        </Button>
      </div>

      {error ? <p className="text-[13px] text-danger">{error}</p> : null}

      {importedCount !== null ? (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-success animate-in fade-in duration-300">
          <Check className="size-4" />
          Imported {importedCount} link{importedCount === 1 ? "" : "s"}
        </p>
      ) : null}

      {proposal ? (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <div className="flex max-h-52 flex-col gap-2 overflow-y-auto overscroll-contain">
            {proposal.links.map((link, index) => (
              <label
                key={`${link.link}-${index}`}
                className="flex cursor-pointer items-center gap-3 rounded-input border border-cardline px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(index)}
                  onChange={() => toggle(index)}
                  className="shrink-0 accent-accent outline-none"
                />
                <span className="min-w-0 truncate font-medium text-ink">{link.title}</span>
                <span className="min-w-0 truncate text-xs text-faint">{link.link}</span>
              </label>
            ))}
          </div>
          <Button onClick={confirm} disabled={selected.size === 0}>
            Add {selected.size} to my page
          </Button>
        </div>
      ) : null}
    </div>
  );
}
