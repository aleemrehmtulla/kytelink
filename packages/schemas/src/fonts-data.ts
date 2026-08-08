export const FONT_KEYS = [
  "default",
  "sans-serif",
  "serif",
  "monospace",
  "initial",
  "cursive",
  "fantasy",
] as const;


export type FontKey = (typeof FONT_KEYS)[number];

export const FONT_FAMILIES: Record<FontKey, string | null> = {
  default: null,
  "sans-serif": "sans-serif",
  serif: "serif",
  monospace: "monospace",
  initial: "initial",
  cursive: "cursive",
  fantasy: "fantasy",
};

export type FontOption = { name: string; key: FontKey; size: string };

export const FONTS: readonly FontOption[] = [
  { name: "Default", key: "default", size: "md" },
  { name: "Normal", key: "sans-serif", size: "2xl" },
  { name: "Serif", key: "serif", size: "2xl" },
  { name: "Monospace", key: "monospace", size: "md" },
  { name: "Initial", key: "initial", size: "2xl" },
  { name: "Cursive", key: "cursive", size: "2xl" },
  { name: "Fantasy", key: "fantasy", size: "2xl" },
];
