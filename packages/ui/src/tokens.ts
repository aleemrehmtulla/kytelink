export const ACCENT = "#6D5AE6";

export const NEUTRAL = {
  50: "#FAFAFC",
  100: "#F0EFF4",
  200: "#E6E5EC",
  300: "#C3C2CC",
  400: "#A3A3AB",
  500: "#8A8A93",
  600: "#6F6F78",
  700: "#3D3D45",
  800: "#201F27",
  900: "#141419",
} as const;

export const STATUS = {
  success: "#3FB96F",
  warning: "#D97706",
  danger: "#C04747",
} as const;

export const RADIUS = {
  sm: "10px",
  md: "12px",
  lg: "14px",
  pill: "99px",
} as const;

export const CHART_NEUTRAL = {
  track: "rgba(138,138,147,0.16)",
  gridline: "rgba(138,138,147,0.18)",
  border: "rgba(138,138,147,0.22)",
  muted: "#8A8A93",
} as const;

export const BRAND_TAGLINE = "Made with love and caffeine.";

export const CHART_SERIES_COLORS = [
  ACCENT,
  "#3FB96F",
  "#E0913A",
  "#4F97E6",
  "#C85CB0",
  "#2FB0A6",
] as const;
