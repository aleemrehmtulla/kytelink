import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
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
  onPatch: (partial: Partial<ProfileContent>) => void;
  onNext: () => void;
}

function prettifyLocalPart(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

export function NameAvatarStep({ draft, username, email, onPatch, onNext }: NameAvatarStepProps) {
  const { capabilities } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const name = draft.displayName ?? prettifyLocalPart(email);
  const avatars = useMemo(() => defaultAvatarOptions(name || username), [name, username]);
  const currentAvatar = draft.avatar?.url ?? null;

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Add your name and photo</h1>
        <p className="mt-1.5 text-sm text-secondary">This is what people see first.</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div
          className="h-24 w-24 overflow-hidden rounded-full border border-cardline"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #e9e7f4, #e9e7f4 7px, #f2f0fa 7px, #f2f0fa 14px)",
          }}
        >
          {currentAvatar ? (
            <img src={currentAvatar} alt="Your avatar" className="h-full w-full object-cover" />
          ) : (
            <img src={avatars[0]} alt="Default avatar" className="h-full w-full object-cover" />
          )}
        </div>

        {capabilities.uploads ? (
          <>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
              Upload a photo
            </Button>
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
                  className={`relative h-11 w-11 rounded-full border-2 ${
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

      <TextInput
        label="Name"
        value={name}
        onChange={(event) => onPatch({ displayName: event.target.value })}
        placeholder="Your name"
      />
      <TextInput
        label="Short bio"
        value={draft.description ?? ""}
        onChange={(event) => onPatch({ description: event.target.value })}
        placeholder="One line about you"
      />

      <Button
        variant="accent"
        block
        size="lg"
        disabled={name.trim().length === 0}
        onClick={() => {
          if (!draft.displayName) onPatch({ displayName: name });
          onNext();
        }}
      >
        Continue <ArrowRight />
      </Button>

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
