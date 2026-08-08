import { classifyLinkEmoji } from "@kytelink/schemas";
import { FaIcon } from "./fa-icon";

export interface LinkEmojiProps {
  emoji: string | undefined;
  size?: number;
}

export function LinkEmoji({ emoji, size = 20 }: LinkEmojiProps) {
  const kind = classifyLinkEmoji(emoji);
  if (kind === "none" || !emoji) return null;
  if (kind === "icon") return <FaIcon name={emoji} size={size} />;
  if (kind === "image")
    return <img src={emoji} alt="" width={size} height={size} className="rounded object-cover" />;
  return <span style={{ fontSize: size }}>{emoji}</span>;
}
