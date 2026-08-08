export const LINK_EMOJI_KINDS = ["icon", "image", "emoji", "none"] as const;
export type LinkEmojiKind = (typeof LINK_EMOJI_KINDS)[number];

export function classifyLinkEmoji(emoji: string | null | undefined): LinkEmojiKind {
  if (!emoji) return "none";
  if (emoji.startsWith("Fa")) return "icon";
  if (emoji.includes("://")) return "image";
  return "emoji";
}
