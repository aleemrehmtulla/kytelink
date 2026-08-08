import type { ThemeKey } from "@kytelink/schemas";
import { THEMES } from "@kytelink/schemas";

// OG-card-only Chakra-token -> hex table. packages/ui owns the canonical
// token palette for on-screen rendering (CONTRACTS.md); this covers just the
// tokens that appear in THEMES so satori (no CSS variable support) gets a
// real color for the handful of themes that aren't already literal hex.
const CHAKRA_TOKEN_HEX: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  "gray.100": "#EDF2F7",
  "gray.200": "#E2E8F0",
  "gray.300": "#CBD5E0",
  "gray.400": "#A0AEC0",
  "gray.700": "#4A5568",
  "gray.900": "#171923",
  "whiteAlpha.900": "#FFFFFFE5",
  "blue.200": "#90CDF4",
  "teal.500": "#319795",
  "pink.200": "#FBB6CE",
  "purple.500": "#805AD5",
  "green.200": "#9AE6B4",
  "purple.700": "#553C9A",
  "orange.300": "#F6AD55",
};

function resolveToken(value: string): string {
  return CHAKRA_TOKEN_HEX[value] ?? value;
}

function parseGradientStops(gradient: string): [string, string] {
  const match = /linear\(to-t,\s*([^,]+),\s*([^)]+)\)/.exec(gradient);
  if (!match) return ["#000000", "#000000"];
  return [resolveToken(match[1]!.trim()), resolveToken(match[2]!.trim())];
}

export interface OgCardColors {
  background: string;
  nameColor: string;
  usernameColor: string;
}

export function ogCardColorsFor(theme: ThemeKey): OgCardColors {
  const themeObject = THEMES[theme];
  const nameColor = resolveToken(themeObject.userData.name);
  const usernameColor = resolveToken(themeObject.userData.description);

  if (themeObject.bg) {
    return { background: resolveToken(themeObject.bg), nameColor, usernameColor };
  }
  if (themeObject.bgGradient) {
    const [from, to] = parseGradientStops(themeObject.bgGradient);
    return { background: `linear-gradient(to top, ${from}, ${to})`, nameColor, usernameColor };
  }
  return { background: "#FFFFFF", nameColor, usernameColor };
}
