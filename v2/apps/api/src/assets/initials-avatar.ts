const PALETTE = [
  "#F56565",
  "#ED8936",
  "#ECC94B",
  "#48BB78",
  "#38B2AC",
  "#4299E1",
  "#667EEA",
  "#9F7AEA",
  "#ED64A6",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase();
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Uploads-capability-off fallback: a deterministic initials avatar rendered
 * locally as SVG — no third-party service, no network call.
 */
export function generateInitialsAvatarSvg(name: string, size = 512): string {
  const initials = initialsFor(name || "?");
  const background = PALETTE[hashString(name || "?") % PALETTE.length];
  const fontSize = Math.round(size * 0.4);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" fill="${background}" />`,
    `<text x="50%" y="50%" dy="0.1em" text-anchor="middle" dominant-baseline="middle" `,
    `font-family="sans-serif" font-size="${fontSize}" fill="#ffffff" font-weight="600">`,
    `${escapeXml(initials)}</text>`,
    `</svg>`,
  ].join("");
}
