import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, PartyPopper } from "lucide-react";
import type { ProfileContent } from "@kytelink/schemas";
import { useApp } from "../../../lib/app-context";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { AvatarCropper } from "../../shared/avatar-cropper";
import { defaultAvatarOptions } from "../../../lib/upload/default-avatar";

export interface NameAvatarStepProps {
  draft: ProfileContent;
  username: string;
  email: string;
  publishing: boolean;
  publishError: string | null;
  onPatch: (partial: Partial<ProfileContent>) => void;
  onPublish: (displayName: string) => void;
  onBack: () => void;
}

function prettifyLocalPart(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

export function NameAvatarStep({
  draft,
  username,
  email,
  publishing,
  publishError,
  onPatch,
  onPublish,
  onBack,
}: NameAvatarStepProps) {
  const { capabilities } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const bioInput = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const name = draft.displayName ?? prettifyLocalPart(email);
  const avatars = useMemo(() => defaultAvatarOptions(name || username), [name, username]);
  const currentAvatar = draft.avatar?.url ?? null;
  const canPublish = name.trim().length > 0 && !publishing;

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function publishNow() {
    if (!canPublish) return;
    onPublish(name.trim());
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            disabled={publishing}
            aria-label="Back"
            className="-ml-2 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-pill text-tertiary transition-colors not-disabled:hover:bg-tint not-disabled:hover:text-ink"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Make it yours</h1>
        </div>
        <p className="mt-1.5 text-sm text-secondary">
          Your name and photo are what people see first.
        </p>
      </div>

      <div className="flex flex-col items-center">
        {capabilities.uploads ? (
          <>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              aria-label="Upload a photo"
              className="group relative cursor-pointer"
            >
              <span className="block size-24 overflow-hidden rounded-full border border-cardline">
                <img
                  src={currentAvatar ?? avatars[0]}
                  alt=""
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-85"
                />
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border border-border bg-card text-secondary shadow-sm transition-colors group-hover:text-ink">
                <Camera className="size-4" />
              </span>
            </button>
          </>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {avatars.map((avatar) => {
              const selected = currentAvatar === avatar;
              return (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => onPatch({ avatar: { url: avatar, lqip: null } })}
                  className={`relative h-11 w-11 cursor-pointer rounded-full border-2 ${
                    selected ? "border-ink" : "border-transparent"
                  }`}
                >
                  <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
                  {selected ? (
                    <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-ink text-white">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <TextInput
          label="Name"
          value={name}
          autoFocus
          onChange={(event) => onPatch({ displayName: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              bioInput.current?.focus();
            }
          }}
          placeholder="Your name"
        />
        <TextInput
          ref={bioInput}
          label="Short bio"
          hint="Optional"
          value={draft.description ?? ""}
          onChange={(event) => onPatch({ description: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              publishNow();
            }
          }}
          placeholder="One line about you"
        />
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
          disabled={name.trim().length === 0}
          onClick={publishNow}
        >
          <PartyPopper /> Go live
        </Button>
      </div>

      <AvatarCropper
        open={cropSrc !== null}
        imageSrc={cropSrc}
        kyteId="onboarding"
        onClose={() => setCropSrc(null)}
        onComplete={(result) => onPatch({ avatar: { url: result.url, lqip: result.lqip } })}
      />
    </div>
  );
}
