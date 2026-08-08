const PALETTE = ["#0EA5E9", "#6366F1", "#22C55E", "#F59E0B", "#EC4899", "#14B8A6"];

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "K";
  const first = words[0]?.[0] ?? "";
  const second = words[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "K";
}

function defaultAvatarSvg(name: string, paletteIndex = 0): string {
  const initials = initialsFrom(name);
  const bg = PALETTE[paletteIndex % PALETTE.length] ?? PALETTE[0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="${bg}"/><text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Inter, sans-serif" font-size="112" font-weight="600" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function defaultAvatarOptions(name: string): string[] {
  return PALETTE.map((_, index) => defaultAvatarSvg(name || "You", index));
}
