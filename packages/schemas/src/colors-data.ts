export const COLOR_KEYS = [
  "default",
  "black",
  "white",
  "red.400",
  "green.400",
  "purple.400",
] as const;


// 'default' resolves to the active theme's value at render time, not a fixed hex.
export type ColorKey = (typeof COLOR_KEYS)[number];

export const COLOR_HEX: Record<ColorKey, string | null> = {
  default: null,
  black: "#000000",
  white: "#FFFFFF",
  "red.400": "#F56565",
  "green.400": "#48BB78",
  "purple.400": "#9F7AEA",
};

export type ColorOption = { name: string; key: ColorKey };

export const COLORS: readonly ColorOption[] = [
  { name: "Theme", key: "default" },
  { name: "Black", key: "black" },
  { name: "White", key: "white" },
  { name: "Red", key: "red.400" },
  { name: "Green", key: "green.400" },
  { name: "Purple", key: "purple.400" },
];

// Curated text-color presets offered in the editor's text-decoration control.
// Stored verbatim as `customColor` (a safe CSS hex), alongside a "Theme" reset
// (null) and a free-form color picker for anything outside this set.
export type PresetColor = { name: string; hex: string };

export const PRESET_TEXT_COLORS: readonly PresetColor[] = [
  { name: "Ink", hex: "#141419" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Violet", hex: "#6D5AE6" },
  { name: "Blue", hex: "#4299E1" },
  { name: "Teal", hex: "#38B2AC" },
  { name: "Green", hex: "#48BB78" },
  { name: "Yellow", hex: "#ECC94B" },
  { name: "Orange", hex: "#ED8936" },
  { name: "Red", hex: "#F56565" },
  { name: "Pink", hex: "#ED64A6" },
  { name: "Purple", hex: "#9F7AEA" },
];

// Curated background presets for the editor's custom-background control. Stored
// verbatim as `customBackground` (a safe CSS color) and layered over the chosen
// theme's own background, alongside a "Theme" reset (null) and a free-form
// picker. Soft tints lead so most pair cleanly with a light theme's dark text;
// two deep tones round it out for anyone who also flips their text color.
export const PRESET_BACKGROUNDS: readonly PresetColor[] = [
  { name: "Blush", hex: "#FCE7F3" },
  { name: "Sky", hex: "#DBEAFE" },
  { name: "Mint", hex: "#DCFCE7" },
  { name: "Butter", hex: "#FEF9C3" },
  { name: "Lilac", hex: "#EDE9FE" },
  { name: "Peach", hex: "#FFEDD5" },
  { name: "Slate", hex: "#1E293B" },
  { name: "Black", hex: "#0B0B0F" },
];
