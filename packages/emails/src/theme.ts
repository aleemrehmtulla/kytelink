import type { CSSProperties } from "react";

const EMAIL_ACCENT = "#0EA5E9";
export const EMAIL_TEXT = "#18181B";
export const EMAIL_MUTED = "#71717A";
export const EMAIL_BORDER = "#E4E4E7";
export const EMAIL_SURFACE = "#FAFAFA";

export const EMAIL_FONT_FAMILY =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const BRAND_TAGLINE = "Designed with love. Built with coffee.";

export const emailHeadingStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  lineHeight: "28px",
  color: EMAIL_TEXT,
  margin: "0 0 8px",
};

export const emailTextStyle: CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: EMAIL_MUTED,
  margin: "0 0 16px",
};

export const emailButtonStyle: CSSProperties = {
  backgroundColor: EMAIL_ACCENT,
  color: "#FFFFFF",
  borderRadius: "8px",
  padding: "12px 20px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

export const emailCodeBoxStyle: CSSProperties = {
  border: `1px solid ${EMAIL_BORDER}`,
  backgroundColor: EMAIL_SURFACE,
  borderRadius: "10px",
  textAlign: "center",
  fontSize: "34px",
  fontWeight: 700,
  letterSpacing: "10px",
  color: EMAIL_TEXT,
  padding: "18px 0",
  margin: "0 0 20px",
};
