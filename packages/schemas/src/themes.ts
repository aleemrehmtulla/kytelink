import { z } from "zod";

export type ThemeObject = {
  bg: string | null;
  bgGradient: string | null;
  previewBorder: string;
  userData: { avatar: string; name: string; description: string };
  icons: string;
  link: { bg: string; text: string; border: string; rounded: string };
};

export const THEME_KEYS = [
  "default",
  "dark",
  "spacegray",
  "popsicle",
  "froggy",
  "lavender",
  "gradientblue",
  "gradientpink",
  "gradientgreen",
  "midnight",
  "dusk",
  "paper",
] as const;

export const themeKeySchema = z.enum(THEME_KEYS);
export type ThemeKey = (typeof THEME_KEYS)[number];

export const THEMES: Record<ThemeKey, ThemeObject> = {
  dark: {
    bg: "black",
    bgGradient: null,
    previewBorder: "gray.700",
    userData: { avatar: "gray.400", name: "gray.100", description: "gray.300" },
    icons: "white",
    link: { bg: "gray.900", text: "white", border: "gray.900", rounded: "lg" },
  },
  default: {
    bg: "white",
    bgGradient: null,
    previewBorder: "gray.700",
    userData: { avatar: "gray.400", name: "black", description: "black" },
    icons: "black",
    link: { bg: "white", text: "black", border: "gray.200", rounded: "lg" },
  },
  spacegray: {
    bg: "gray.100",
    bgGradient: null,
    previewBorder: "gray.700",
    userData: { avatar: "gray.400", name: "black", description: "black" },
    icons: "black",
    link: { bg: "white", text: "black", border: "gray.200", rounded: "lg" },
  },
  popsicle: {
    bg: "#eff8fe",
    bgGradient: null,
    previewBorder: "gray.700",
    userData: { avatar: "#b3d4e0", name: "#1a202c", description: "#1a202c" },
    icons: "black",
    link: { bg: "#57caf7", text: "white", border: "#57caf7", rounded: "lg" },
  },
  froggy: {
    bg: "#f0fff4",
    bgGradient: null,
    previewBorder: "gray.700",
    userData: { avatar: "#b3d4e0", name: "#1a202c", description: "#1a202c" },
    icons: "black",
    link: { bg: "#a6eb99", text: "white", border: "#a6eb99", rounded: "30" },
  },
  lavender: {
    bg: "#f9f8fe",
    bgGradient: null,
    previewBorder: "gray.700",
    userData: { avatar: "#b3d4e0", name: "#1a202c", description: "#1a202c" },
    icons: "black",
    link: { bg: "#bfb8f9", text: "white", border: "#bfb8f9", rounded: "lg" },
  },
  gradientblue: {
    bg: null,
    bgGradient: "linear(to-t, blue.200, teal.500)",
    previewBorder: "gray.700",
    userData: { avatar: "#b3d4e0", name: "white", description: "white" },
    icons: "black",
    link: { bg: "white", text: "black", border: "gray.200", rounded: "lg" },
  },
  gradientpink: {
    bg: null,
    bgGradient: "linear(to-t, pink.200, purple.500)",
    previewBorder: "gray.700",
    userData: { avatar: "#b3d4e0", name: "white", description: "white" },
    icons: "black",
    link: { bg: "white", text: "black", border: "gray.200", rounded: "lg" },
  },
  gradientgreen: {
    bg: null,
    bgGradient: "linear(to-t, green.200, teal.500)",
    previewBorder: "gray.700",
    userData: { avatar: "#b3d4e0", name: "white", description: "white" },
    icons: "black",
    link: { bg: "white", text: "black", border: "gray.200", rounded: "lg" },
  },
  midnight: {
    bg: "#0b1020",
    bgGradient: null,
    previewBorder: "gray.700",
    userData: { avatar: "#2a3350", name: "gray.100", description: "gray.300" },
    icons: "white",
    link: { bg: "#161d33", text: "white", border: "#161d33", rounded: "lg" },
  },
  dusk: {
    bg: null,
    bgGradient: "linear(to-t, purple.700, orange.300)",
    previewBorder: "gray.700",
    userData: { avatar: "#b3a0c8", name: "white", description: "white" },
    icons: "white",
    link: { bg: "whiteAlpha.900", text: "black", border: "whiteAlpha.900", rounded: "lg" },
  },
  paper: {
    bg: "#faf7f0",
    bgGradient: null,
    previewBorder: "gray.700",
    userData: { avatar: "#d9d2c4", name: "#2d2a24", description: "#5a544a" },
    icons: "black",
    link: { bg: "white", text: "#2d2a24", border: "#e6ddcd", rounded: "lg" },
  },
};

export const THEME_DISPLAY_NAMES: Record<ThemeKey, string> = {
  default: "Light",
  dark: "Dark",
  spacegray: "Space Gray",
  popsicle: "Popsicle",
  froggy: "Froggy",
  lavender: "Lavender",
  gradientblue: "✨ Blue",
  gradientpink: "✨ Pink",
  gradientgreen: "✨ Green",
  midnight: "Midnight",
  dusk: "Dusk",
  paper: "Paper",
};

export type ThemeRegistryEntry = { key: ThemeKey; name: string; theme: ThemeObject };

export const THEME_REGISTRY: readonly ThemeRegistryEntry[] = THEME_KEYS.map((key) => ({
  key,
  name: THEME_DISPLAY_NAMES[key],
  theme: THEMES[key],
}));
