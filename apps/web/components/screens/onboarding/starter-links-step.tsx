import { useState } from "react";
import { PartyPopper } from "lucide-react";
import type { Link, ProfileContent } from "@kytelink/schemas";
import { prefixHttps } from "@kytelink/schemas";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { ImportPanel } from "../../shared/import-panel";
import { sendEventBeacon } from "../../../lib/beacons";

export interface StarterLinksStepProps {
  draft: ProfileContent;
  publishing: boolean;
  onPatch: (partial: Partial<ProfileContent>) => void;
  onAddLinks: (links: Link[], meta: { displayName?: string; description?: string }) => void;
  onPublish: () => void;
}

interface Row {
  title: string;
  link: string;
}

export function StarterLinksStep({
  draft,
  publishing,
  onPatch,
  onAddLinks,
  onPublish,
}: StarterLinksStepProps) {
  const [rows, setRows] = useState<Row[]>([
    { title: "", link: "" },
    { title: "", link: "" },
    { title: "", link: "" },
  ]);

  function updateRow(index: number, partial: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...partial } : row)));
  }

  function commitManualRows() {
    const links: Link[] = rows
      .filter((row) => row.link.trim().length > 0 && row.title.trim().length > 0)
      .map((row) => ({ title: row.title.trim(), link: prefixHttps(row.link.trim()) }));
    if (links.length > 0) {
      onPatch({ links: [...draft.links, ...links] });
    }
    return links.length;
  }

  function publishNow() {
    commitManualRows();
    onPublish();
  }

  function skip() {
    sendEventBeacon("onboarding_skipped_links");
    onPublish();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Add a few links</h1>
        <p className="mt-1.5 text-sm text-secondary">Optional — you can add more anytime.</p>
      </div>

      <ImportPanel kyteId="onboarding" onImport={onAddLinks} />

      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-2 sm:flex-row">
            <TextInput
              placeholder={`Link ${index + 1} title`}
              value={row.title}
              onChange={(event) => updateRow(index, { title: event.target.value })}
            />
            <TextInput
              placeholder="https://…"
              value={row.link}
              onChange={(event) => updateRow(index, { link: event.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button variant="accent" block size="lg" loading={publishing} onClick={publishNow}>
          <PartyPopper /> Go live
        </Button>
        <Button
          variant="link"
          size="sm"
          disabled={publishing}
          onClick={skip}
          className="px-0 text-tertiary underline underline-offset-2 not-disabled:hover:text-ink"
        >
          Skip for now — add links later
        </Button>
      </div>
    </div>
  );
}
