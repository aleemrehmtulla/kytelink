import { useRef, useState } from "react";
import {
  FONTS,
  PRESET_BACKGROUNDS,
  PRESET_TEXT_COLORS,
  THEME_DISPLAY_NAMES,
  THEME_REGISTRY,
  type FontKey,
  type ThemeKey,
} from "@kytelink/schemas";
import { THEME_EXTRAS } from "@kytelink/ui";
import { ChevronLeft, ChevronRight, ImagePlus, Palette } from "lucide-react";
import { useApp } from "../../../../lib/app-context";
import { useEditor } from "../../../../lib/editor/editor-context";
import { TextInput } from "../../../ui/text-input";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
import { AvatarCropper } from "../../../shared/avatar-cropper";
import { ThemeSwatch } from "../theme-swatch";
import { cn } from "@/lib/cn";

// Five curated themes surface inline; the rest live behind "View more". The
// selected theme is always kept visible (it replaces the last inline slot when
// it falls outside the curated set).
const CURATED_THEME_KEYS: readonly ThemeKey[] = [
  "default",
  "dark",
  "lavender",
  "gradientblue",
  "gradientpink",
];

// Gallery order groups themes by family (lights → dark → gradients) so the modal
// reads as a considered set rather than the frozen enum's storage order.
const GALLERY_THEME_KEYS: readonly ThemeKey[] = [
  "default",
  "spacegray",
  "paper",
  "lavender",
  "popsicle",
  "froggy",
  "dark",
  "midnight",
  "gradientblue",
  "gradientpink",
  "gradientgreen",
  "dusk",
];

const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

export function DesignTab() {
  const { capabilities } = useApp();
  const { kyte, draft, patchDraft, allows } = useEditor();
  const readOnly = !allows("edit_draft");
  const fileInput = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const fontIndex = Math.max(
    0,
    FONTS.findIndex((font) => font.key === (draft.customFont ?? "default")),
  );

  function setFont(key: FontKey) {
    patchDraft({ customFont: key === "default" ? null : key });
  }

  function setColor(value: string | null) {
    patchDraft({ customColor: value });
  }

  function selectTheme(key: ThemeKey) {
    // Picking a preset theme clears any custom background so the theme's own
    // background actually takes effect (otherwise the override would mask it).
    patchDraft({ theme: key, customBackground: null });
  }

  function setBackground(value: string | null) {
    patchDraft({ customBackground: value });
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  const currentColor = (draft.customColor ?? "").toLowerCase();
  const isThemeColor = draft.customColor == null;
  const isPresetColor = PRESET_TEXT_COLORS.some((c) => c.hex.toLowerCase() === currentColor);
  const isCustomColor = !isThemeColor && !isPresetColor;
  const pickerValue = HEX6_RE.test(draft.customColor ?? "") ? draft.customColor! : "#6D5AE6";

  const currentBg = (draft.customBackground ?? "").toLowerCase();
  const isThemeBg = draft.customBackground == null;
  const isPresetBg = PRESET_BACKGROUNDS.some((c) => c.hex.toLowerCase() === currentBg);
  const isCustomBg = !isThemeBg && !isPresetBg;
  const bgPickerValue = HEX6_RE.test(draft.customBackground ?? "")
    ? draft.customBackground!
    : "#F1EEFD";

  // A theme tile counts as active only when no custom background is layered on
  // top — otherwise the background control owns the selected state.
  const themeSelected = (key: ThemeKey) => draft.theme === key && isThemeBg;

  const inlineThemeKeys: ThemeKey[] = CURATED_THEME_KEYS.includes(draft.theme)
    ? [...CURATED_THEME_KEYS]
    : [draft.theme, ...CURATED_THEME_KEYS.slice(0, CURATED_THEME_KEYS.length - 1)];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <div className="size-20 overflow-hidden rounded-full border border-border bg-tint">
                {draft.avatar?.url ? (
                  <img src={draft.avatar.url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-faint">
                    <ImagePlus className="size-6" />
                  </div>
                )}
              </div>
              {capabilities.uploads && !readOnly ? (
                <>
                  <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
                  <Button variant="link" size="sm" onClick={() => fileInput.current?.click()}>
                    Click to change
                  </Button>
                </>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <TextInput
                label="Name"
                value={draft.displayName ?? ""}
                disabled={readOnly}
                onChange={(event) => patchDraft({ displayName: event.target.value })}
              />
              <TextInput
                label="Description"
                value={draft.description ?? ""}
                disabled={readOnly}
                onChange={(event) => patchDraft({ description: event.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Text decoration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={readOnly}
              aria-label="Previous font"
              onClick={() => setFont(FONTS[(fontIndex - 1 + FONTS.length) % FONTS.length]?.key ?? "default")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span
              className="flex-1 text-center text-lg text-foreground"
              style={{ fontFamily: FONTS[fontIndex]?.key === "default" ? undefined : FONTS[fontIndex]?.key }}
            >
              {FONTS[fontIndex]?.name} font
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={readOnly}
              aria-label="Next font"
              onClick={() => setFont(FONTS[(fontIndex + 1) % FONTS.length]?.key ?? "default")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <span className="text-xs font-medium text-tertiary">Text color</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setColor(null)}
                aria-label="Theme color"
                aria-pressed={isThemeColor}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2 text-[10px] font-semibold outline-none transition-colors",
                  isThemeColor ? "border-accent text-ink" : "border-border text-tertiary",
                )}
                style={{
                  background:
                    "conic-gradient(from 180deg, #F56565, #ED8936, #ECC94B, #48BB78, #4299E1, #6D5AE6, #ED64A6, #F56565)",
                }}
                title="Match the theme"
              >
                <span className="rounded-full bg-card px-1 py-0.5">Aa</span>
              </button>

              {PRESET_TEXT_COLORS.map((option) => {
                const active = option.hex.toLowerCase() === currentColor;
                return (
                  <button
                    key={option.hex}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setColor(option.hex)}
                    aria-label={option.name}
                    aria-pressed={active}
                    className={cn(
                      "size-9 rounded-full border-2 outline-none transition-colors",
                      active ? "border-accent" : "border-border",
                    )}
                    style={{ background: option.hex }}
                  />
                );
              })}

              <label
                className={cn(
                  "relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 outline-none transition-colors",
                  isCustomColor ? "border-accent" : "border-border",
                  readOnly && "pointer-events-none opacity-60",
                )}
                aria-label="Custom color"
                title="Pick any color"
                style={{
                  background: isCustomColor
                    ? draft.customColor!
                    : "conic-gradient(from 90deg, #F56565, #ED8936, #ECC94B, #48BB78, #4299E1, #6D5AE6, #ED64A6, #F56565)",
                }}
              >
                {!isCustomColor ? <Palette className="size-4 text-white drop-shadow" /> : null}
                <input
                  type="color"
                  disabled={readOnly}
                  value={pickerValue}
                  onChange={(event) => setColor(event.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Themes</CardTitle>
          <Button variant="link" size="sm" onClick={() => setGalleryOpen(true)}>
            View more
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2.5">
            {inlineThemeKeys.map((key) => {
              const entry = THEME_REGISTRY.find((e) => e.key === key);
              if (!entry) return null;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={readOnly}
                  className="outline-none"
                  onClick={() => selectTheme(key)}
                >
                  <ThemeSwatch
                    extras={THEME_EXTRAS[key]}
                    name={entry.name}
                    selected={themeSelected(key)}
                  />
                </button>
              );
            })}
          </div>

          <div className="border-hairline mt-5 flex flex-col gap-2 border-t pt-5">
            <span className="text-tertiary text-xs font-medium">Background</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setBackground(null)}
                aria-label="Theme background"
                aria-pressed={isThemeBg}
                className={cn(
                  "size-9 overflow-hidden rounded-full border-2 outline-none transition-colors",
                  isThemeBg ? "border-accent" : "border-border",
                )}
                style={{ background: THEME_EXTRAS[draft.theme].background }}
                title="Use the theme's own background"
              />

              {PRESET_BACKGROUNDS.map((option) => {
                const active = option.hex.toLowerCase() === currentBg;
                return (
                  <button
                    key={option.hex}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setBackground(option.hex)}
                    aria-label={option.name}
                    aria-pressed={active}
                    className={cn(
                      "size-9 rounded-full border-2 outline-none transition-colors",
                      active ? "border-accent" : "border-border",
                    )}
                    style={{ background: option.hex }}
                  />
                );
              })}

              <label
                className={cn(
                  "relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 outline-none transition-colors",
                  isCustomBg ? "border-accent" : "border-border",
                  readOnly && "pointer-events-none opacity-60",
                )}
                aria-label="Custom background"
                title="Pick any background color"
                style={{
                  background: isCustomBg
                    ? draft.customBackground!
                    : "conic-gradient(from 90deg, #F56565, #ED8936, #ECC94B, #48BB78, #4299E1, #6D5AE6, #ED64A6, #F56565)",
                }}
              >
                {!isCustomBg ? <Palette className="size-4 text-white drop-shadow" /> : null}
                <input
                  type="color"
                  disabled={readOnly}
                  value={bgPickerValue}
                  onChange={(event) => setBackground(event.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose a theme</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {GALLERY_THEME_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={readOnly}
                  className="outline-none"
                  onClick={() => selectTheme(key)}
                >
                  <ThemeSwatch
                    extras={THEME_EXTRAS[key]}
                    name={THEME_DISPLAY_NAMES[key]}
                    selected={themeSelected(key)}
                    size="lg"
                  />
                </button>
              ))}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <AvatarCropper
        open={cropSrc !== null}
        imageSrc={cropSrc}
        kyteId={kyte.id}
        onClose={() => setCropSrc(null)}
        onComplete={(result) => patchDraft({ avatar: { url: result.url, lqip: result.lqip } })}
      />
    </div>
  );
}
