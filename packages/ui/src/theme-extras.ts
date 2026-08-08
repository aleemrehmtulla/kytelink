import type { ThemeKey } from "@kytelink/schemas";
import { ACCENT } from "./tokens";

// Every stored theme id renders through these ui-owned visual extras, so the
// frozen ThemeObject in @kytelink/schemas stays the untouched contract shape
// (ids/names/columns unchanged) while the profile gets the Kite redesign look.
// The four prototype archetypes — Paper (light), Ink (dark), Lilac, Sand — lead
// the set; the nine legacy ids keep their light/dark identity, re-tuned onto the
// same vocabulary. No persisted value ever breaks: a theme id that resolves in
// THEMES resolves here too.
export interface ThemeExtras {
  background: string;
  nameColor: string;
  descriptionColor: string;
  iconColor: string;
  iconHoverColor: string;
  watermarkColor: string;
  placeholderStripeA: string;
  placeholderStripeB: string;
  placeholderLabelColor: string;
  linkRadius: string;
  textShadow?: string;
  link: {
    background: string;
    border: string;
    color: string;
    boxShadow: string;
    backdropFilter?: string;
    hoverBackground: string;
    hoverBorder: string;
    hoverColor: string;
    prefixBackground: string;
  };
}

const INK = "#141419";
const INK_MUTED = "#8A8A93";
const GHOST = "#C3C2CC";
const BORDER = "#E6E5EC";
const ACCENT_SOFT = "#F1EEFD";
const ACCENT_ON_DARK = "#A89CF2";
const RADIUS_ROUNDED = "12px";
const RADIUS_PILL = "99px";

interface LightThemeInput {
  background: string;
  nameColor?: string;
  descriptionColor?: string;
  iconColor?: string;
  linkText?: string;
  linkBackground?: string;
  linkBorder?: string;
  linkRadius?: string;
  stripeA?: string;
  stripeB?: string;
}

function lightTheme(input: LightThemeInput): ThemeExtras {
  const nameColor = input.nameColor ?? INK;
  const linkText = input.linkText ?? nameColor;
  return {
    background: input.background,
    nameColor,
    descriptionColor: input.descriptionColor ?? INK_MUTED,
    iconColor: input.iconColor ?? INK_MUTED,
    iconHoverColor: nameColor,
    watermarkColor: GHOST,
    placeholderStripeA: input.stripeA ?? "#E9E7F4",
    placeholderStripeB: input.stripeB ?? "#F2F0FA",
    placeholderLabelColor: INK_MUTED,
    linkRadius: input.linkRadius ?? RADIUS_ROUNDED,
    link: {
      background: input.linkBackground ?? "#FFFFFF",
      border: `1px solid ${input.linkBorder ?? BORDER}`,
      color: linkText,
      boxShadow: "none",
      hoverBackground: ACCENT_SOFT,
      hoverBorder: `1px solid ${ACCENT}`,
      hoverColor: ACCENT,
      prefixBackground: "transparent",
    },
  };
}

interface InkThemeInput {
  background: string;
  linkBackground?: string;
  linkRadius?: string;
}

function inkTheme(input: InkThemeInput): ThemeExtras {
  return {
    background: input.background,
    nameColor: "#FFFFFF",
    descriptionColor: "#9D9CA6",
    iconColor: "#9D9CA6",
    iconHoverColor: "#FFFFFF",
    watermarkColor: "#5F5E68",
    placeholderStripeA: "#2C2B34",
    placeholderStripeB: "#201F27",
    placeholderLabelColor: "#5F5E68",
    linkRadius: input.linkRadius ?? RADIUS_ROUNDED,
    link: {
      background: input.linkBackground ?? "rgba(255,255,255,0.04)",
      border: "1px solid #2C2B34",
      color: "#FFFFFF",
      boxShadow: "none",
      backdropFilter: "blur(12px)",
      hoverBackground: "rgba(109,90,230,0.16)",
      hoverBorder: `1px solid ${ACCENT_ON_DARK}`,
      hoverColor: ACCENT_ON_DARK,
      prefixBackground: "rgba(255,255,255,0.06)",
    },
  };
}

interface GlassThemeInput {
  background: string;
  linkRadius?: string;
  textShadow?: string;
}

function glassTheme(input: GlassThemeInput): ThemeExtras {
  return {
    background: input.background,
    nameColor: "#FFFFFF",
    descriptionColor: "rgba(255,255,255,0.88)",
    iconColor: "rgba(255,255,255,0.82)",
    iconHoverColor: "#FFFFFF",
    watermarkColor: "rgba(255,255,255,0.72)",
    placeholderStripeA: "rgba(255,255,255,0.30)",
    placeholderStripeB: "rgba(255,255,255,0.16)",
    placeholderLabelColor: "rgba(255,255,255,0.85)",
    linkRadius: input.linkRadius ?? RADIUS_ROUNDED,
    textShadow: input.textShadow,
    link: {
      background: "rgba(255,255,255,0.16)",
      border: "1px solid rgba(255,255,255,0.34)",
      color: "#FFFFFF",
      boxShadow: "none",
      backdropFilter: "blur(10px)",
      hoverBackground: "rgba(255,255,255,0.28)",
      hoverBorder: "1px solid rgba(255,255,255,0.62)",
      hoverColor: "#FFFFFF",
      prefixBackground: "rgba(255,255,255,0.18)",
    },
  };
}

export const THEME_EXTRAS: Record<ThemeKey, ThemeExtras> = {
  default: lightTheme({ background: "#FFFFFF" }),
  spacegray: lightTheme({ background: "#F1F0F4" }),
  popsicle: lightTheme({
    background: "#EEF6FD",
    linkBorder: "#DCE7F0",
    stripeA: "#DCEAF6",
    stripeB: "#EDF5FB",
  }),
  froggy: lightTheme({
    background: "#F0FBF4",
    linkBorder: "#D8EBDF",
    linkRadius: RADIUS_PILL,
    stripeA: "#DBEEE1",
    stripeB: "#EDF7F0",
  }),
  lavender: lightTheme({
    background: "#F1EEFD",
    nameColor: "#3B2D6E",
    descriptionColor: "#6E639B",
    iconColor: "#6E639B",
    linkText: "#3B2D6E",
    linkBorder: "#E1DAF8",
    stripeA: "#E2DCF7",
    stripeB: "#F0ECFB",
  }),
  paper: lightTheme({
    background: "#F7F3EC",
    nameColor: "#4A4238",
    descriptionColor: "#8A7F6E",
    iconColor: "#8A7F6E",
    linkText: "#4A4238",
    linkBorder: "#E7DFD1",
    stripeA: "#EDE5D6",
    stripeB: "#F5EFE4",
  }),
  gradientblue: glassTheme({
    background: "linear-gradient(160deg, #5b8def 0%, #3aa9c9 55%, #57caf7 100%)",
  }),
  gradientpink: glassTheme({
    background: "linear-gradient(160deg, #c06cf0 0%, #d15f93 55%, #f6a45a 100%)",
  }),
  gradientgreen: glassTheme({
    background: "linear-gradient(160deg, #2fbf88 0%, #3ba98f 55%, #8fd67f 100%)",
  }),
  dark: inkTheme({ background: "#17161C" }),
  midnight: inkTheme({
    background:
      "radial-gradient(1100px 620px at 50% -12%, #1c2a5c 0%, rgba(9,13,28,0) 60%)," +
      "radial-gradient(760px 520px at 82% 8%, rgba(66,99,214,0.20), rgba(9,13,28,0) 55%)," +
      "linear-gradient(180deg, #0b1020 0%, #070a17 100%)",
  }),
  dusk: glassTheme({
    background:
      "linear-gradient(158deg, #241645 0%, #4a2a6e 28%, #8a3f83 55%, #c85f7e 78%, #f6a45a 100%)",
    textShadow: "0 1px 12px rgba(40,15,60,0.35)",
  }),
};
