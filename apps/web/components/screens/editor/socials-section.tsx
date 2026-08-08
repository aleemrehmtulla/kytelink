import { useState } from "react";
import {
  VISIBLE_ICON_OPTIONS,
  getIconFaKey,
  prefixHttps,
  type Icon,
  type IconOption,
} from "@kytelink/schemas";
import { ArrowLeft, Plus } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { useEditor } from "../../../lib/editor/editor-context";
import { SortableList } from "../../shared/sortable-list";
import { FaIcon } from "../../shared/fa-icon";
import { Modal } from "../../ui/modal";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";

const MAX_ICONS = 5;

export function SocialsSection() {
  const { toast } = useApp();
  const { draft, patchDraft, allows } = useEditor();
  const readOnly = !allows("edit_draft");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<IconOption | null>(null);
  const [handle, setHandle] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const icons = draft.icons;

  function openAdd() {
    if (icons.length >= MAX_ICONS && editIndex === null) {
      toast("Max 5 icons. Remove one first!", "error");
      return;
    }
    setSelected(null);
    setHandle("");
    setEditIndex(null);
    setModalOpen(true);
  }

  function openEdit(index: number) {
    const icon = icons[index];
    if (!icon) return;
    const option = VISIBLE_ICON_OPTIONS.find((candidate) => candidate.name === icon.name) ?? null;
    setSelected(option);
    setHandle((icon.url ?? "").replace(option?.prefill ?? "", ""));
    setEditIndex(index);
    setModalOpen(true);
  }

  function reorder(ids: string[]) {
    const next = ids
      .map((id) => icons.find((icon) => icon.name === id))
      .filter((icon): icon is Icon => Boolean(icon));
    patchDraft({ icons: next });
  }

  function saveIcon() {
    if (!selected) return;
    const url = selected.prefill === "CONTACT" ? handle : prefixHttps(`${selected.prefill}${handle}`);
    const entry: Icon = { name: selected.name, url };
    if (editIndex !== null) {
      patchDraft({ icons: icons.map((icon, index) => (index === editIndex ? entry : icon)) });
    } else {
      patchDraft({ icons: [...icons, entry] });
    }
    setModalOpen(false);
  }

  function remove() {
    if (editIndex === null) return;
    patchDraft({ icons: icons.filter((_, index) => index !== editIndex) });
    setModalOpen(false);
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="text-[13px] font-semibold text-ink">Socials</div>
      <div className="flex flex-wrap items-center gap-2.5">
        <SortableList
          ids={icons.map((icon) => icon.name)}
          direction="horizontal"
          onReorder={reorder}
          className="contents"
          renderItem={(id, handleProps) => {
            const index = icons.findIndex((icon) => icon.name === id);
            const faKey = getIconFaKey(id) ?? "FaGlobe";
            return (
              <div
                {...handleProps.attributes}
                {...handleProps.listeners}
                onClick={() => openEdit(index)}
                className="flex size-10 cursor-grab items-center justify-center rounded-[12px] border border-cardline bg-card text-ink transition-colors hover:border-accent"
              >
                <FaIcon name={faKey} size={17} />
              </div>
            );
          }}
        />
        {!readOnly ? (
          <button
            type="button"
            onClick={openAdd}
            className="flex size-10 cursor-pointer items-center justify-center rounded-[12px] border border-cardline bg-card text-faint outline-none transition-colors hover:border-accent hover:text-accent"
            aria-label="Add social icon"
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? selected.name : "Add icon"}
        maxWidth={520}
      >
        {selected ? (
          <div className="flex flex-col gap-4">
            <Button
              variant="link"
              size="sm"
              onClick={() => setSelected(null)}
              className="self-start px-0"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <TextInput
              leftAddon={selected.prefill === "CONTACT" ? "contact" : selected.prefill}
              placeholder={selected.username}
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handle.trim() && saveIcon()}
            />
            <div className="flex items-center justify-between">
              {editIndex !== null ? (
                <Button variant="danger-ghost" size="sm" onClick={remove}>
                  Delete icon
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={saveIcon} disabled={!handle.trim()}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid max-h-[280px] grid-cols-4 gap-2 overflow-y-auto">
            {VISIBLE_ICON_OPTIONS.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={() => {
                  setSelected(option);
                  setHandle("");
                }}
                className="flex flex-col items-center justify-center gap-1.5 rounded-input py-3 text-center text-ink outline-none transition-colors hover:bg-tint"
              >
                <FaIcon name={option.icon} size={20} />
                <span className="text-[12px] text-tertiary">{option.name}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
