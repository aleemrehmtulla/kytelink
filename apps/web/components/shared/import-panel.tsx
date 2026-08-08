import { useState } from "react";
import type { ImportProposal, Link } from "@kytelink/schemas";
import { useApp } from "../../lib/app-context";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";

export interface ImportPanelProps {
  kyteId: string;
  onImport: (links: Link[], meta: { displayName?: string; description?: string }) => void;
}

export function ImportPanel({ kyteId, onImport }: ImportPanelProps) {
  const { api, toast } = useApp();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<ImportProposal | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function onFetch() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const result = await api.import.fromUrl({ kyteId, url });
      setProposal(result);
      setSelected(new Set(result.links.map((_, index) => index)));
    } catch {
      toast("couldn't read that page", "error");
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
    setProposal(null);
    setUrl("");
    toast(`Imported ${links.length} link${links.length === 1 ? "" : "s"}`, "success");
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
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onFetch()}
        />
        <Button onClick={onFetch} loading={loading} variant="secondary" className="shrink-0">
          Fetch
        </Button>
      </div>

      {proposal ? (
        <div className="flex flex-col gap-2">
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
