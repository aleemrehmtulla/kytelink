import { useRef, useState } from "react";
import { prefixHttps, type Link } from "@kytelink/schemas";
import { Plus } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import { Modal } from "../../ui/modal";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { LinkEmoji } from "../../shared/link-emoji";
import { FaIcon } from "../../shared/fa-icon";
import { cn } from "@/lib/cn";

const ICON_CHOICES = [
  "FaLinkedin",
  "FaInstagram",
  "FaSoundcloud",
  "FaTwitter",
  "FaDiscord",
  "FaGithub",
  "FaGlobe",
  "FaSnapchat",
  "FaYoutube",
  "FaMedium",
  "FaTwitch",
  "FaSpotify",
];

const EMOJI_CHOICES = ["🤘", "🦄", "👻", "🌶", "🪁", "📞", "🚢", "👋", "🥶", "✉️", "🙉", "📆"];

export interface LinkModalProps {
  open: boolean;
  initial: Link | null;
  onClose: () => void;
  onSave: (link: Link) => void;
  onDelete?: () => void;
}

export function LinkModal({ open, initial, onClose, onSave, onDelete }: LinkModalProps) {
  const { toast } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.link ?? "");
  const [emoji, setEmoji] = useState<string | undefined>(initial?.emoji);
  const [picker, setPicker] = useState<"icon" | "emoji" | "image" | null>(null);

  function reset() {
    setTitle(initial?.title ?? "");
    setUrl(initial?.link ?? "");
    setEmoji(initial?.emoji);
    setPicker(null);
  }

  function close() {
    reset();
    onClose();
  }

  function save() {
    if (!title.trim()) {
      toast("Add a title for this link", "error");
      return;
    }
    if (!url.trim() || !url.includes(".")) {
      toast("Add a valid link", "error");
      return;
    }
    onSave({ title: title.trim(), link: prefixHttps(url.trim()), emoji });
    close();
  }

  function onImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEmoji(reader.result as string);
      setPicker(null);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={initial ? "Edit link" : "Add link"}
      footer={
        <div className="flex items-center justify-between">
          {onDelete ? (
            <Button
              variant="danger-ghost"
              size="sm"
              onClick={() => {
                onDelete();
                close();
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save}>Save</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPicker(picker ? null : "icon")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-tint text-subtle-foreground outline-none transition-colors hover:border-accent"
            aria-label="Choose icon, emoji or image"
          >
            {emoji ? <LinkEmoji emoji={emoji} size={24} /> : <Plus className="size-4" />}
          </button>
          <div className="flex-1">
            <TextInput
              placeholder="Link title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && save()}
            />
          </div>
        </div>

        <TextInput
          placeholder="https://…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && save()}
        />

        {picker ? (
          <div className="rounded-md border border-border p-3">
            <div className="mb-3 flex gap-2">
              {(["icon", "emoji", "image"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPicker(mode)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm capitalize outline-none",
                    picker === mode ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            {picker === "icon" ? (
              <div className="grid grid-cols-4 gap-2">
                {ICON_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => {
                      setEmoji(choice);
                      setPicker(null);
                    }}
                    className="flex h-11 items-center justify-center rounded-md border border-border text-foreground outline-none hover:border-accent"
                  >
                    <FaIcon name={choice} size={20} />
                  </button>
                ))}
              </div>
            ) : null}
            {picker === "emoji" ? (
              <div className="grid grid-cols-6 gap-2">
                {EMOJI_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => {
                      setEmoji(choice);
                      setPicker(null);
                    }}
                    className="flex h-11 items-center justify-center rounded-md border border-border text-xl outline-none hover:border-accent"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : null}
            {picker === "image" ? (
              <div>
                <input ref={fileInput} type="file" accept="image/*" hidden onChange={onImage} />
                <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                  Upload your own image
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
