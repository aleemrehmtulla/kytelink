import { z } from "zod";
import { COLOR_KEYS } from "./colors";

export const MAX_LINK_TITLE_LENGTH = 100;
export const MAX_URL_LENGTH = 2048;
export const MAX_DESCRIPTION_LENGTH = 300;
export const MAX_DISPLAY_NAME_LENGTH = 100;
export const MAX_SEO_TITLE_LENGTH = 100;
export const MAX_SEO_DESCRIPTION_LENGTH = 300;
export const MAX_CSS_COLOR_LENGTH = 50;

const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

// Disallowed C0/C1 control characters. \t (0x09), \n (0x0A) and \r (0x0D) are
// intentionally permitted so multi-line descriptions survive; everything else in
// 0x00-0x1F plus DEL (0x7F) is rejected. A null byte or other control char passes
// zod's .trim()/.min()/.max() but blows up as an uncaught Prisma error downstream
// (Phase 4 H2), so we reject it at the schema boundary.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export function hasControlChars(value: string): boolean {
  return CONTROL_CHARS_RE.test(value);
}

function rejectControlChars(schema: z.ZodString) {
  return schema.refine((value) => !hasControlChars(value), {
    message: "must not contain control characters",
  });
}

export const SAFE_WEB_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);
export const SAFE_CONTACT_PROTOCOLS: ReadonlySet<string> = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

export function prefixHttps(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "") return trimmed;
  if (SCHEME_RE.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isSafeUrl(input: string, options?: { allowContact?: boolean }): boolean {
  const allowed = options?.allowContact ? SAFE_CONTACT_PROTOCOLS : SAFE_WEB_PROTOCOLS;
  let parsed: URL;
  try {
    parsed = new URL(prefixHttps(input));
  } catch {
    return false;
  }
  return allowed.has(parsed.protocol);
}

export const safeWebUrlSchema = z
  .string()
  .trim()
  .min(1)
  .transform(prefixHttps)
  .refine((value) => value.length <= MAX_URL_LENGTH, {
    message: `URL must be at most ${MAX_URL_LENGTH} characters`,
  })
  .refine((value) => isSafeUrl(value), {
    message: "URL must use http(s); javascript: and data: are rejected",
  });

export const contactUrlSchema = z
  .string()
  .trim()
  .min(1)
  .transform(prefixHttps)
  .refine((value) => value.length <= MAX_URL_LENGTH, {
    message: `URL must be at most ${MAX_URL_LENGTH} characters`,
  })
  .refine((value) => isSafeUrl(value, { allowContact: true }), {
    message: "URL must use http(s)/mailto/tel; javascript: and data: are rejected",
  });

export const linkTitleSchema = rejectControlChars(
  z.string().trim().min(1).max(MAX_LINK_TITLE_LENGTH),
);
export const descriptionSchema = rejectControlChars(z.string().max(MAX_DESCRIPTION_LENGTH));
export const displayNameSchema = rejectControlChars(z.string().max(MAX_DISPLAY_NAME_LENGTH));
export const seoTitleSchema = rejectControlChars(z.string().max(MAX_SEO_TITLE_LENGTH));
export const seoDescriptionSchema = rejectControlChars(
  z.string().max(MAX_SEO_DESCRIPTION_LENGTH),
);

// Safe CSS color for `Link.color`, which is injected raw into an inline `style`
// `background` (Phase 4 H1). Accepts only shapes that cannot break out of the CSS
// value: hex (#rgb/#rrggbb/#rrggbbaa), rgb()/rgba()/hsl()/hsla() functional
// notation, a bounded set of CSS named colors + `transparent`, or the Chakra theme
// tokens the app already uses (COLOR_KEYS). Anything containing `;`, `url(`,
// `expression`, `<`, or stray whitespace fails to match and is rejected.
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NUM = "-?\\d{1,3}(?:\\.\\d+)?%?";
const ALPHA = "(?:0|1|0?\\.\\d+|\\d{1,3}%)";
const RGB_COLOR_RE = new RegExp(
  `^rgba?\\(\\s*${NUM}\\s*(?:,\\s*${NUM}\\s*){2}(?:,\\s*${ALPHA}\\s*)?\\)$`,
);
const HSL_COLOR_RE = new RegExp(
  `^hsla?\\(\\s*-?\\d{1,3}(?:\\.\\d+)?(?:deg)?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%\\s*(?:,\\s*${ALPHA}\\s*)?\\)$`,
);

const NAMED_CSS_COLORS: ReadonlySet<string> = new Set([
  "transparent",
  "currentcolor",
  "black",
  "white",
  "red",
  "green",
  "blue",
  "yellow",
  "orange",
  "purple",
  "pink",
  "gray",
  "grey",
  "cyan",
  "magenta",
  "brown",
  "teal",
  "navy",
  "olive",
  "maroon",
  "lime",
  "aqua",
  "silver",
  "gold",
  "indigo",
  "violet",
  "coral",
  "salmon",
  "khaki",
  "crimson",
  "turquoise",
  "tan",
  "beige",
  "ivory",
  "lavender",
]);

const CHAKRA_COLOR_TOKENS: ReadonlySet<string> = new Set(COLOR_KEYS);

export function isSafeCssColor(value: string): boolean {
  if (value.length === 0 || value.length > MAX_CSS_COLOR_LENGTH) return false;
  if (CHAKRA_COLOR_TOKENS.has(value)) return true;
  if (NAMED_CSS_COLORS.has(value.toLowerCase())) return true;
  return HEX_COLOR_RE.test(value) || RGB_COLOR_RE.test(value) || HSL_COLOR_RE.test(value);
}

export const safeCssColorSchema = z.string().refine(isSafeCssColor, {
  message: "must be a safe CSS color (hex, rgb/rgba, hsl/hsla, a named color, or a theme token)",
});

// A `Link.emoji` is polymorphic: a react-icons `Fa...` key, a single emoji /
// grapheme, or an image URL that `classifyLinkEmoji` renders raw as `<img src>`
// (Phase 4 H4 — an attacker fired `169.254.169.254` at every visitor). Any value
// that could be treated as a URL (contains `://` or begins with a scheme) MUST be
// a safe http(s) URL under the same policy as link targets, so `javascript:`,
// `data:`, and `ftp://…` image sources are rejected. Non-URL values are capped so
// they cannot smuggle a payload through the emoji <span>.
export const MAX_EMOJI_LENGTH = 16;
const FA_KEY_RE = /^Fa[A-Za-z0-9]+$/;

function isUrlLikeEmoji(value: string): boolean {
  return value.includes("://") || SCHEME_RE.test(value);
}

export function isSafeLinkEmoji(value: string): boolean {
  if (isUrlLikeEmoji(value)) {
    return value.length <= MAX_URL_LENGTH && isSafeUrl(value);
  }
  if (hasControlChars(value)) return false;
  if (FA_KEY_RE.test(value)) return true;
  return value.length > 0 && value.length <= MAX_EMOJI_LENGTH;
}

export const linkEmojiSchema = z.string().refine(isSafeLinkEmoji, {
  message: "emoji must be a Fa icon key, a short emoji, or a safe http(s) image URL",
});
