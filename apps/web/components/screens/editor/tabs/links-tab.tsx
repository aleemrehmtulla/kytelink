import { useState } from "react";
import type { Link } from "@kytelink/schemas";
import { useEditor } from "../../../../lib/editor/editor-context";
import { sendEventBeacon } from "../../../../lib/beacons";
import { GripVertical, Plus } from "lucide-react";
import { SortableList } from "../../../shared/sortable-list";
import { LinkEmoji } from "../../../shared/link-emoji";
import { ImportPanel } from "../../../shared/import-panel";
import { LinkModal } from "../link-modal";
import { SocialsSection } from "../socials-section";

function linkKey(link: Link, index: number): string {
  return `${index}::${link.link}`;
}

export function LinksTab() {
  const { draft, patchDraft, allows } = useEditor();
  const readOnly = !allows("edit_draft");
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const links = draft.links;
  const ids = links.map((link, index) => linkKey(link, index));

  function reorder(nextIds: string[]) {
    const next = nextIds
      .map((id) => links[ids.indexOf(id)])
      .filter((link): link is Link => Boolean(link));
    patchDraft({ links: next });
  }

  function save(link: Link) {
    if (editIndex !== null) {
      patchDraft({ links: links.map((existing, index) => (index === editIndex ? link : existing)) });
    } else {
      patchDraft({ links: [...links, link] });
      sendEventBeacon("link_added");
    }
  }

  function remove(index: number) {
    patchDraft({ links: links.filter((_, i) => i !== index) });
  }

  function displayUrl(link: string): string {
    return link.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  return (
    <div className="flex flex-col gap-3">
      {!readOnly ? (
        <button
          type="button"
          onClick={() => {
            setEditIndex(null);
            setModalOpen(true);
          }}
          className="flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-card border border-accent-border bg-accent-soft text-sm font-medium text-accent outline-none transition-colors hover:bg-accent-soft/70"
        >
          <Plus className="size-4" />
          Add link
        </button>
      ) : null}

      {links.length === 0 ? (
        <div className="rounded-card border border-cardline bg-card p-8 text-center">
          <p className="text-sm font-medium text-ink">You have no links yet</p>
          <p className="mt-1 text-[13px] text-tertiary">Add your first one to get started.</p>
        </div>
      ) : (
        <SortableList
          ids={ids}
          onReorder={reorder}
          className="flex flex-col gap-3"
          renderItem={(id, handle) => {
            const index = ids.indexOf(id);
            const link = links[index];
            if (!link) return null;
            return (
              <div className="flex items-center gap-3.5 rounded-card border border-cardline bg-card p-4">
                <button
                  {...handle.attributes}
                  {...handle.listeners}
                  disabled={readOnly}
                  className="cursor-grab text-ghost outline-none transition-colors not-disabled:hover:text-tertiary disabled:cursor-not-allowed"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="size-4" />
                </button>
                {link.emoji ? (
                  <span className="flex size-6 shrink-0 items-center justify-center text-ink">
                    <LinkEmoji emoji={link.emoji} size={20} />
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{link.title}</div>
                  <div className="truncate text-xs text-faint">{displayUrl(link.link)}</div>
                </div>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditIndex(index);
                      setModalOpen(true);
                    }}
                    className="shrink-0 text-[13px] font-medium text-accent outline-none transition-colors hover:text-accent-hover"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            );
          }}
        />
      )}

      {!readOnly ? (
        <ImportPanel onImport={(imported) => patchDraft({ links: [...links, ...imported] })} />
      ) : null}

      <SocialsSection />

      <LinkModal
        open={modalOpen}
        initial={editIndex !== null ? links[editIndex] ?? null : null}
        onClose={() => setModalOpen(false)}
        onSave={save}
        onDelete={editIndex !== null ? () => remove(editIndex) : undefined}
      />
    </div>
  );
}
